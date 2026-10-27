const router = require('express').Router();
const M = require('../models');
const { getState, dashboard } = require('../lib/state');
const { topo, addDays } = require('../lib/schedule');
const { seedDatabase } = require('../seed');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (m) => { throw new HttpError(400, m); };
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const sum = (a) => a.reduce((s, x) => s + (x.cost || 0), 0);
const clean = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== '' && v !== null));

/** Generic CRUD. `check(body, id)` runs business validation before every write. */
function crud(path, Model, { check, sort = { createdAt: 1 }, populate, beforeDelete } = {}) {
  router.get(path, wrap(async (q, r) => r.json(await Model.find().sort(sort).populate(populate || '').lean())));
  router.post(path, wrap(async (q, r) => {
    const body = clean(q.body);
    if (check) await check(body, null);
    r.status(201).json(await Model.create(body));
  }));
  router.put(`${path}/:id`, wrap(async (q, r) => {
    const doc = await Model.findById(q.params.id);
    if (!doc) throw new HttpError(404, 'Record not found');
    const merged = { ...doc.toObject(), ...clean(q.body) };
    if (check) await check(merged, doc._id, doc);
    doc.set(clean(q.body));
    r.json(await doc.save());
  }));
  router.delete(`${path}/:id`, wrap(async (q, r) => {
    if (beforeDelete) await beforeDelete(q.params.id);
    await Model.findByIdAndDelete(q.params.id);
    r.json({ ok: true });
  }));
}

// ---------- Project (charter + plan + status) ----------
router.get('/project', wrap(async (q, r) => r.json(await M.Project.findOne().lean())));
router.put('/project', wrap(async (q, r) => {
  const p = await M.Project.findOne();
  const b = pick(q.body, ['name', 'description', 'objectives', 'stakeholders', 'scopeIn', 'scopeOut', 'approvedBudget', 'startDate', 'deadline',
    'statusDate', 'status', 'plan', 'milestones', 'responsibilities', 'thresholds']);
  const next = { ...p.toObject(), ...b };
  if (!(Number(next.approvedBudget) > 0)) bad('Approved budget must be greater than zero.');
  if (new Date(next.deadline) <= new Date(next.startDate)) bad('Deadline must be after the start date.');
  if (p.closure.isClosed) bad('The project is closed and can no longer be edited.');
  const planned = (await M.Activity.find().lean()).reduce((s, a) => s + a.plannedCost, 0);
  if (planned > Number(next.approvedBudget)) bad(`Approved budget cannot be below the planned activity cost (${planned}).`);
  p.set(b);
  r.json(await p.save());
}));
router.post('/project/close', wrap(async (q, r) => {
  const p = await M.Project.findOne();
  const acts = await M.Activity.find().lean();
  const crit = await M.Defect.countDocuments({ severity: 'Critical', status: { $nin: ['Resolved', 'Closed'] } });
  const pending = await M.ChangeRequest.countDocuments({ status: 'Pending' });
  const problems = [];
  if (acts.some((a) => a.percentComplete < 100)) problems.push('all activities must be 100% complete');
  if (crit) problems.push(`${crit} critical defect(s) are unresolved`);
  if (pending) problems.push(`${pending} change request(s) are still pending`);
  if (!q.body.acceptedBy) problems.push('"Accepted by" is required');
  if (problems.length) bad('Cannot close project: ' + problems.join('; ') + '.');
  p.closure = { isClosed: true, closedAt: new Date(), acceptedBy: q.body.acceptedBy, lessonsLearned: q.body.lessonsLearned };
  p.status = 'Closed';
  r.json(await p.save());
}));

// ---------- Requirements ----------
crud('/requirements', M.Requirement, {
  sort: { module: 1, createdAt: 1 },
  check: async (b, id) => {
    if (!b.title || !b.module) bad('Requirement title and module are required.');
    if (id && b.status !== 'Approved' && (await M.Activity.exists({ requirement: id })))
      bad('This requirement already has scheduled activities and must stay Approved. Remove those activities first.');
  },
  beforeDelete: async (id) => { if (await M.Activity.exists({ requirement: id })) bad('Cannot delete a requirement that has activities.'); },
});

// ---------- Activities ----------
crud('/activities', M.Activity, {
  populate: { path: 'requirement', select: 'title module' },
  check: async (b, id) => {
    const req = await M.Requirement.findById(b.requirement?._id || b.requirement);
    if (!req) bad('Select the requirement this activity delivers.');
    if (req.status !== 'Approved') bad(`Requirement "${req.title}" is ${req.status}. Only approved requirements can be scheduled; raise a change request.`);
    const deps = (b.dependencies || []).map(String);
    if (id && deps.includes(String(id))) bad('An activity cannot depend on itself.');
    const others = await M.Activity.find(id ? { _id: { $ne: id } } : {}).lean();
    if (deps.some((x) => !others.find((o) => String(o._id) === x))) bad('One or more dependencies do not exist.');
    if (!Number.isInteger(Number(b.durationDays)) || b.durationDays < 1) bad('Duration must be a whole number of days (1 or more).');
    if (b.percentComplete === 100 && !(b.actualCost > 0)) bad('A completed activity must have an actual cost recorded.');
    const project = await M.Project.findOne();
    const total = others.reduce((s, a) => s + a.plannedCost, 0) + Number(b.plannedCost || 0);
    if (total > project.approvedBudget) bad(`Total planned cost (${total.toLocaleString()}) would exceed the approved budget (${project.approvedBudget.toLocaleString()}). Raise a change request.`);
    try { topo([...others, { _id: id || 'new', name: b.name, dependencies: deps }]); } catch (e) { bad(e.message); }
  },
  beforeDelete: async (id) => {
    await M.Activity.updateMany({}, { $pull: { dependencies: id } });
    if (await M.Defect.exists({ activity: id })) await M.Defect.updateMany({ activity: id }, { $unset: { activity: 1 } });
  },
});

// ---------- Change requests ----------
const snapshot = async () => {
  const s = await getState();
  return {
    approvedBudget: s.project.approvedBudget, deadline: s.project.deadline, plannedCost: s.evm.BAC, projectedFinish: s.schedule.projectedFinish,
    approvedRequirements: await M.Requirement.countDocuments({ status: 'Approved' }), activities: s.acts.length, CPI: s.evm.CPI, SPI: s.evm.SPI,
    daysLate: Math.max(0, s.schedule.varianceDays),
  };
};
router.get('/change-requests', wrap(async (q, r) => r.json(await M.ChangeRequest.find().sort({ createdAt: -1 }).populate('requirement', 'title module status').lean())));
router.post('/change-requests', wrap(async (q, r) => {
  const b = clean(q.body);
  if (!b.title) bad('Change request title is required.');
  if (!b.justification || b.justification.length < 10) bad('Please give a justification (at least 10 characters).');
  if (Number(b.costImpact || 0) < 0 || Number(b.scheduleImpactDays || 0) < 0) bad('Cost and schedule impacts cannot be negative.');
  const nr = clean(b.newRequirement), na = clean(b.newActivity);
  if (Object.keys(na).length && !nr.title) bad('A new activity needs a new requirement to deliver.');
  if (nr.title && !nr.module) bad('New requirement needs a module.');
  if (na.name && (!na.assignee || !(na.durationDays >= 1) || na.plannedCost === undefined)) bad('New activity needs assignee, duration and planned cost.');
  const cr = await M.ChangeRequest.create({ ...b, newRequirement: nr, newActivity: na });
  if (nr.title) { const rq = await M.Requirement.create({ ...nr, status: 'Proposed', changeRequest: cr._id }); cr.requirement = rq._id; await cr.save(); }
  r.status(201).json(cr);
}));
router.post('/change-requests/:id/decision', wrap(async (q, r) => {
  const cr = await M.ChangeRequest.findById(q.params.id);
  if (!cr) throw new HttpError(404, 'Change request not found');
  if (cr.status !== 'Pending') bad(`This change request is already ${cr.status}.`);
  const { decision, decidedBy, decisionNote } = q.body;
  if (!['Approved', 'Rejected'].includes(decision)) bad('Decision must be Approved or Rejected.');
  if (!decidedBy) bad('Enter the approver name.');
  const before = await snapshot();
  if (decision === 'Approved') {
    const na = cr.newActivity && cr.newActivity.name ? cr.newActivity : null;
    if (na) { // pre-validate dependency cycles before touching any data
      const all = (await M.Activity.find().lean()).map((a) => ({ ...a, dependencies: [...a.dependencies] }));
      (na.successors || []).forEach((sid) => { const t = all.find((a) => String(a._id) === String(sid)); if (t) t.dependencies.push('NEW'); });
      try { topo([...all, { _id: 'NEW', name: na.name, dependencies: (na.dependencies || []).map(String) }]); } catch (e) { bad(e.message); }
    }
    const p = await M.Project.findOne();
    p.approvedBudget += cr.costImpact; p.deadline = addDays(p.deadline, cr.scheduleImpactDays);
    await p.save();
    if (cr.requirement) await M.Requirement.findByIdAndUpdate(cr.requirement, { status: 'Approved' });
    if (na) {
      const act = await M.Activity.create({ name: na.name, requirement: cr.requirement, assignee: na.assignee, durationDays: na.durationDays, plannedCost: na.plannedCost, dependencies: na.dependencies });
      if (na.successors?.length) await M.Activity.updateMany({ _id: { $in: na.successors } }, { $addToSet: { dependencies: act._id } });
    }
  } else if (cr.requirement) await M.Requirement.findByIdAndUpdate(cr.requirement, { status: 'Rejected' });
  Object.assign(cr, { status: decision, decidedBy, decisionNote, decidedAt: new Date() });
  cr.impact = decision === 'Approved' ? { before, after: await snapshot() } : undefined;
  r.json(await cr.save());
}));
router.delete('/change-requests/:id', wrap(async (q, r) => {
  const cr = await M.ChangeRequest.findById(q.params.id);
  if (cr && cr.status !== 'Pending') bad('Only pending change requests can be deleted; decided ones are kept as an audit record.');
  if (cr?.requirement) await M.Requirement.findByIdAndDelete(cr.requirement);
  await M.ChangeRequest.findByIdAndDelete(q.params.id);
  r.json({ ok: true });
}));

// ---------- Quality & risk ----------
crud('/defects', M.Defect, { populate: { path: 'activity', select: 'name' }, sort: { createdAt: -1 } });
crud('/checklist', M.Checklist, {
  sort: { deliverable: 1, createdAt: 1 },
  check: async (b) => { if (['Pass', 'Fail'].includes(b.status) && !b.inspector) bad('Record the inspector name when marking an item Pass or Fail.'); b.inspectedAt = new Date(); },
});
router.put('/checklist-inspect/:id', wrap(async (q, r) => {
  const { status, inspector, notes } = q.body;
  if (!['Pending', 'Pass', 'Fail'].includes(status)) bad('Invalid status.');
  if (status !== 'Pending' && !inspector) bad('Enter the inspector name first.');
  r.json(await M.Checklist.findByIdAndUpdate(q.params.id, { status, inspector, notes, inspectedAt: new Date() }, { new: true }));
}));
crud('/risks', M.Risk, { sort: { score: -1, createdAt: 1 } });

// ---------- Computed views ----------
router.get('/schedule', wrap(async (q, r) => {
  const s = await getState();
  r.json({ ...s.schedule, startDate: s.project.startDate, statusDate: s.statusDate, milestones: s.project.milestones });
}));
router.get('/evm', wrap(async (q, r) => { const s = await getState(); r.json({ ...s.evm, statusDate: s.statusDate, rows: s.schedule.rows }); }));
router.get('/dashboard', wrap(async (q, r) => r.json(await dashboard())));
router.get('/wbs', wrap(async (q, r) => {
  const s = await getState();
  const reqs = await M.Requirement.find({ status: 'Approved' }).sort({ module: 1, createdAt: 1 }).lean();
  const byReq = {};
  s.schedule.rows.forEach((t) => (byReq[String(t.requirement)] = [...(byReq[String(t.requirement)] || []), t]));
  const children = [...new Set(reqs.map((x) => x.module))].map((m, i) => {
    const code = `1.${i + 1}`;
    const wps = reqs.filter((x) => x.module === m).map((x, j) => {
      const c2 = `${code}.${j + 1}`;
      const tasks = (byReq[String(x._id)] || []).map((t, k) => ({ code: `${c2}.${k + 1}`, name: t.name, type: 'Task', cost: t.plannedCost, assignee: t.assignee, children: [] }));
      return { code: c2, name: x.title, type: 'Work package', priority: x.priority, cost: sum(tasks), children: tasks };
    });
    return { code, name: m, type: 'Deliverable', cost: sum(wps), children: wps };
  });
  r.json({ code: '1', name: s.project.name, type: 'Project', cost: sum(children), children });
}));
router.post('/admin/seed', wrap(async (q, r) => { await seedDatabase(); r.json({ ok: true }); }));

module.exports = { router, HttpError };
