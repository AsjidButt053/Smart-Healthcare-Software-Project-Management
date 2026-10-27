// Pure scheduling engine (no DB access) -> easy to unit test.
const DAY = 86400000;
const d = (x) => new Date(x);
const addDays = (x, n) => new Date(d(x).getTime() + n * DAY);
const diffDays = (a, b) => Math.round((d(a) - d(b)) / DAY);
const maxDate = (arr) => arr.reduce((m, x) => (m === null || d(x) > d(m) ? x : m), null);

/** Topological order; throws on circular dependency. */
function topo(acts) {
  const ids = new Set(acts.map((a) => String(a._id)));
  const state = {}, order = [];
  const byId = Object.fromEntries(acts.map((a) => [String(a._id), a]));
  const visit = (id, path) => {
    if (state[id] === 2) return;
    if (state[id] === 1) throw new Error('Circular dependency detected: ' + [...path, id].map((i) => byId[i].name).join(' -> '));
    state[id] = 1;
    for (const dep of (byId[id].dependencies || []).map(String)) if (ids.has(dep)) visit(dep, [...path, id]);
    state[id] = 2; order.push(id);
  };
  ids.forEach((id) => visit(id, []));
  return order.map((id) => byId[id]);
}

/**
 * Forward pass twice: baseline (no slippage) and current (recorded delay or auto-overdue).
 * Backward pass on the current schedule gives float and the critical path.
 */
function computeSchedule(acts, projectStart, statusDate, deadline) {
  const order = topo(acts);
  const rows = {};
  for (const a of order) {
    const id = String(a._id);
    const deps = (a.dependencies || []).map(String).filter((x) => rows[x]);
    const dur = Math.max(1, a.durationDays);
    const floor = a.plannedStart ? maxDate([projectStart, a.plannedStart]) : projectStart;
    const baseStart = maxDate([floor, ...deps.map((x) => addDays(rows[x].baseEnd, 1))]);
    const baseEnd = addDays(baseStart, dur - 1);
    const pct = a.percentComplete || 0;
    const overdue = pct < 100 && d(statusDate) > d(baseEnd) ? diffDays(statusDate, baseEnd) : 0;
    const slip = pct >= 100 ? a.delayDays || 0 : Math.max(a.delayDays || 0, overdue);
    const start = maxDate([floor, ...deps.map((x) => addDays(rows[x].end, 1))]);
    const end = addDays(start, dur + slip - 1);
    rows[id] = {
      id, name: a.name, assignee: a.assignee, requirement: a.requirement, dependencies: deps, durationDays: dur,
      plannedCost: a.plannedCost || 0, actualCost: a.actualCost || 0, percentComplete: pct, delayDays: a.delayDays || 0,
      baseStart, baseEnd, start, end, slipDays: slip, shiftDays: diffDays(end, baseEnd),
    };
  }
  const list = order.map((a) => rows[String(a._id)]);
  const projectEnd = list.length ? maxDate(list.map((r) => r.end)) : projectStart;
  const succ = {};
  list.forEach((r) => r.dependencies.forEach((p) => (succ[p] = [...(succ[p] || []), r.id])));
  const lf = {};
  [...list].reverse().forEach((r) => {
    lf[r.id] = (succ[r.id] || []).length
      ? addDays(maxDate(succ[r.id].map((s) => addDays(lf[s], -(rows[s].durationDays + rows[s].slipDays) + 1))), -1)
      : projectEnd;
    r.floatDays = diffDays(lf[r.id], r.end);
    r.critical = r.floatDays === 0;
    r.delayed = r.slipDays > 0;
  });
  const downstream = (id, seen = new Set()) => {
    (succ[id] || []).forEach((s) => { if (!seen.has(s) && rows[s].shiftDays > 0) { seen.add(s); downstream(s, seen); } });
    return seen;
  };
  list.forEach((r) => { r.impacted = r.delayed ? [...downstream(r.id)].map((s) => rows[s].name) : []; });
  const baselineFinish = list.length ? maxDate(list.map((r) => r.baseEnd)) : projectStart;
  const varianceDays = diffDays(projectEnd, deadline);
  return {
    rows: list, baselineFinish, projectedFinish: projectEnd, deadline, varianceDays,
    delayedCount: list.filter((r) => r.delayed).length, willMissDeadline: varianceDays > 0,
    projectDelayDays: diffDays(projectEnd, baselineFinish),
  };
}

module.exports = { computeSchedule, topo, addDays, diffDays };
