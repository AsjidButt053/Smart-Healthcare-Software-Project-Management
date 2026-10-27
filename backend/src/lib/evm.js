// Pure Earned Value Management engine.
const { diffDays } = require('./schedule');
const r2 = (n) => (n === null || !isFinite(n) ? null : Math.round(n * 100) / 100);

function computeEVM(rows, statusDate, approvedBudget, th = { cpi: 0.9, spi: 0.9 }) {
  let BAC = 0, PV = 0, EV = 0, AC = 0;
  for (const r of rows) {
    const elapsed = Math.min(1, Math.max(0, (diffDays(statusDate, r.baseStart) + 1) / r.durationDays));
    BAC += r.plannedCost; PV += r.plannedCost * elapsed;
    EV += (r.plannedCost * r.percentComplete) / 100; AC += r.actualCost;
  }
  const CPI = AC > 0 ? EV / AC : null, SPI = PV > 0 ? EV / PV : null;
  const EAC = CPI ? BAC / CPI : BAC;
  const out = {
    BAC: r2(BAC), PV: r2(PV), EV: r2(EV), AC: r2(AC), CPI: r2(CPI), SPI: r2(SPI),
    CV: r2(EV - AC), SV: r2(EV - PV), EAC: r2(EAC), ETC: r2(EAC - AC), VAC: r2(BAC - EAC),
    percentComplete: BAC ? r2((EV / BAC) * 100) : 0, approvedBudget, thresholds: th, warnings: [],
  };
  const w = (level, msg) => out.warnings.push({ level, msg });
  if (CPI !== null) {
    if (CPI < th.cpi) w('danger', `Cost overrun: CPI ${r2(CPI)} is below the ${th.cpi} threshold.`);
    else if (CPI < 1) w('warning', `Cost trending over plan: CPI ${r2(CPI)} is below 1.0.`);
  }
  if (SPI !== null) {
    if (SPI < th.spi) w('danger', `Schedule deviation: SPI ${r2(SPI)} is below the ${th.spi} threshold.`);
    else if (SPI < 1) w('warning', `Behind schedule: SPI ${r2(SPI)} is below 1.0.`);
  }
  if (BAC > approvedBudget) w('danger', `Planned activity cost (${BAC}) exceeds the approved budget (${approvedBudget}).`);
  if (EAC > approvedBudget) w('danger', `Forecast at completion (${r2(EAC)}) exceeds the approved budget by ${r2(EAC - approvedBudget)}.`);
  return out;
}

module.exports = { computeEVM };
