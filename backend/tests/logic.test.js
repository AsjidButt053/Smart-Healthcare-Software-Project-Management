const test = require('node:test');
const assert = require('node:assert/strict');
const { computeSchedule } = require('../src/lib/schedule');
const { computeEVM } = require('../src/lib/evm');

const iso = (d) => new Date(d).toISOString().slice(0, 10);
const START = '2026-01-01', DEADLINE = '2026-01-20';
const mk = (over = {}) => [
  { _id: 'a', name: 'A', durationDays: 10, dependencies: [], plannedCost: 1000, actualCost: 1200, percentComplete: 100, delayDays: 0, ...over.a },
  { _id: 'b', name: 'B', durationDays: 10, dependencies: ['a'], plannedCost: 1000, actualCost: 400, percentComplete: 50, delayDays: 0, ...over.b },
];

test('TC-01 baseline schedule follows finish-to-start dependency', () => {
  const s = computeSchedule(mk(), START, '2026-01-15', DEADLINE);
  assert.equal(iso(s.rows[1].baseStart), '2026-01-11');
  assert.equal(iso(s.projectedFinish), '2026-01-20');
  assert.equal(s.willMissDeadline, false);
});

test('TC-02 recorded delay pushes dependent activity and project finish', () => {
  const s = computeSchedule(mk({ a: { delayDays: 3 } }), START, '2026-01-15', DEADLINE);
  assert.equal(iso(s.rows[0].end), '2026-01-13');
  assert.equal(iso(s.rows[1].start), '2026-01-14');
  assert.equal(iso(s.projectedFinish), '2026-01-23');
  assert.equal(s.varianceDays, 3);
  assert.deepEqual(s.rows[0].impacted, ['B']);
});

test('TC-03 overdue incomplete activity is detected automatically', () => {
  const s = computeSchedule(mk(), START, '2026-01-25', DEADLINE);
  assert.equal(s.rows[1].slipDays, 5);
  assert.equal(iso(s.projectedFinish), '2026-01-25');
  assert.equal(s.willMissDeadline, true);
});

test('TC-04 circular dependency is rejected', () => {
  const acts = mk({ a: { dependencies: ['b'] } });
  assert.throws(() => computeSchedule(acts, START, '2026-01-15', DEADLINE), /Circular dependency/);
});

test('TC-05 EVM indicators are calculated correctly', () => {
  const s = computeSchedule(mk(), START, '2026-01-15', DEADLINE);
  const e = computeEVM(s.rows, '2026-01-15', 2500);
  assert.equal(e.BAC, 2000); assert.equal(e.PV, 1500); assert.equal(e.EV, 1500); assert.equal(e.AC, 1600);
  assert.equal(e.CPI, 0.94); assert.equal(e.SPI, 1); assert.equal(e.CV, -100); assert.equal(e.SV, 0);
  assert.equal(e.EAC, 2133.33);
});

test('TC-06 warnings raised when CPI/SPI fall below thresholds', () => {
  const s = computeSchedule(mk({ b: { actualCost: 1500 } }), START, '2026-01-15', DEADLINE);
  const e = computeEVM(s.rows, '2026-01-15', 2500, { cpi: 0.9, spi: 0.9 });
  assert.ok(e.CPI < 0.9);
  assert.ok(e.warnings.some((w) => w.level === 'danger' && /Cost overrun/.test(w.msg)));
});

test('TC-07 forecast above approved budget raises a danger warning', () => {
  const s = computeSchedule(mk(), START, '2026-01-15', DEADLINE);
  const e = computeEVM(s.rows, '2026-01-15', 2000);
  assert.ok(e.warnings.some((w) => /exceeds the approved budget/.test(w.msg)));
});

test('TC-08 approved change adds cost and schedule (before/after)', () => {
  const base = mk();
  const b = computeSchedule(base, START, '2026-01-15', DEADLINE);
  const withNew = [...base, { _id: 'n', name: 'New', durationDays: 5, dependencies: ['a'], plannedCost: 500, percentComplete: 0 }];
  withNew[1] = { ...withNew[1], dependencies: ['a', 'n'] };
  const a = computeSchedule(withNew, START, '2026-01-15', '2026-01-25');
  assert.equal(computeEVM(a.rows, '2026-01-15', 3000).BAC - computeEVM(b.rows, '2026-01-15', 3000).BAC, 500);
  assert.equal(iso(a.baselineFinish), '2026-01-25'); // B now waits for New (ends Jan 15)
});
