const { Project, Activity, Requirement, ChangeRequest, Defect, Risk, Checklist } = require('../models');
const { computeSchedule } = require('./schedule');
const { computeEVM } = require('./evm');

async function getState() {
  const project = await Project.findOne().lean();
  if (!project) return null;
  const acts = await Activity.find().lean();
  const statusDate = project.statusDate || new Date();
  const schedule = computeSchedule(acts, project.startDate, statusDate, project.deadline);
  const evm = computeEVM(schedule.rows, statusDate, project.approvedBudget, project.thresholds);
  return { project, acts, schedule, evm, statusDate };
}

async function dashboard() {
  const s = await getState();
  if (!s) return null;
  const { project, schedule, evm } = s;
  const [pendingCRs, defects, risks, reqs, checklist] = await Promise.all([
    ChangeRequest.find({ status: 'Pending' }).lean(), Defect.find().lean(),
    Risk.find({ status: { $ne: 'Closed' } }).sort({ score: -1 }).limit(3).lean(), Requirement.find().lean(), Checklist.find().lean(),
  ]);
  const unresolved = (x) => !['Resolved', 'Closed'].includes(x.status);
  const critical = defects.filter((x) => x.severity === 'Critical' && unresolved(x));
  const warnings = [...evm.warnings];
  if (schedule.willMissDeadline) warnings.push({ level: 'danger', msg: `Projected finish misses the deadline by ${schedule.varianceDays} day(s).` });
  if (schedule.delayedCount) warnings.push({ level: 'warning', msg: `${schedule.delayedCount} activit${schedule.delayedCount > 1 ? 'ies are' : 'y is'} delayed.` });
  if (critical.length) warnings.push({ level: 'danger', msg: `${critical.length} critical defect(s) unresolved.` });
  if (pendingCRs.length) warnings.push({ level: 'info', msg: `${pendingCRs.length} change request(s) awaiting a decision.` });
  return {
    project, evm, schedule: { ...schedule, rows: undefined }, warnings, progress: evm.percentComplete,
    pendingCRs, delayed: schedule.rows.filter((r) => r.delayed), criticalDefects: critical,
    defectCount: { total: defects.length, open: defects.filter(unresolved).length },
    topRisks: risks, scope: { approved: reqs.filter((r) => r.status === 'Approved').length, proposed: reqs.filter((r) => r.status === 'Proposed').length },
    quality: { total: checklist.length, passed: checklist.filter((c) => c.status === 'Pass').length, failed: checklist.filter((c) => c.status === 'Fail').length },
  };
}
module.exports = { getState, dashboard };
