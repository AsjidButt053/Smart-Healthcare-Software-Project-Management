require('dotenv').config();
const mongoose = require('mongoose');
const M = require('./models');
const { addDays } = require('./lib/schedule');

async function seedDatabase() {
  await Promise.all(Object.values(M).map((m) => m.deleteMany({})));
  const start = new Date('2026-09-07');            // Monday, week 1
  const deadline = addDays(start, 16 * 7 - 1);     // 16-week project
  const team = { pm: 'Ayesha Khan', b1: 'Usman Tariq', b2: 'Hamza Ali', f1: 'Sana Malik', f2: 'Bilal Ahmed', db: 'Fatima Noor', qa: 'Hassan Raza' };

  await M.Project.create({
    name: 'Smart Healthcare Project Management System',
    description: 'Appointments, laboratory reports, doctor schedules, online consultations and billing for a network of five hospitals.',
    objectives: ['Deliver all five modules to the five-hospital network within 16 weeks', 'Stay within the approved budget of PKR 5,000,000', 'Reach zero unresolved critical defects before go-live', 'Control scope through a formal change request process'],
    stakeholders: [
      { name: 'Hospital Management Board', role: 'Sponsor', interest: 'Budget, deadline and strategic value' },
      { name: 'Chief Medical Officers (5 hospitals)', role: 'Customer', interest: 'Clinical workflow fit' },
      { name: 'Doctors & Nurses', role: 'End users', interest: 'Fast scheduling and record access' },
      { name: 'Lab & Billing Staff', role: 'End users', interest: 'Accurate reports and invoices' },
      { name: 'Patients', role: 'End users', interest: 'Easy appointments and consultations' },
    ],
    scopeIn: 'Patient appointments, laboratory reports, doctor schedules, online consultations, hospital billing, web portal, testing, deployment and training.',
    scopeOut: 'Hardware procurement, pharmacy inventory, insurance claim integration, third-party EMR migration. (AI diagnosis and mobile app are outside scope until a change request is approved.)',
    approvedBudget: 5000000, baselineBudget: 5000000, startDate: start, deadline, baselineDeadline: deadline, statusDate: new Date('2026-10-26'),
    status: 'Monitoring',
    plan: {
      scope: 'Scope baseline = approved requirements only. Changes follow the change request process (impact analysis, sponsor approval, re-baseline).',
      schedule: '16 weeks, 12 baseline activities with finish-to-start dependencies. Weekly status review; critical path tracked after every update.',
      cost: 'Budget PKR 5,000,000 (planned activity cost PKR 4,740,000 + PKR 260,000 reserve). EVM reviewed weekly; CPI/SPI warning threshold 0.90.',
      quality: 'Peer review of every deliverable, checklist inspection per module, defect triage twice a week; no go-live with unresolved critical defects.',
    },
    milestones: [
      { name: 'Requirements signed off', date: addDays(start, 9), done: true }, { name: 'Design complete', date: addDays(start, 19), done: true },
      { name: 'Core modules complete', date: addDays(start, 59) }, { name: 'Integration testing complete', date: addDays(start, 80) },
      { name: 'UAT sign-off', date: addDays(start, 90) }, { name: 'Go-live at all five hospitals', date: deadline },
    ],
    responsibilities: [
      { member: team.pm, role: 'Project Manager', duty: 'Planning, stakeholder communication, change control, reporting' },
      { member: team.b1, role: 'Backend Developer', duty: 'Appointments and online consultation services' },
      { member: team.b2, role: 'Backend Developer', duty: 'Doctor schedules, patient records, lab reports, billing' },
      { member: team.f1, role: 'Frontend Developer', duty: 'UI/UX design system and doctor/patient screens' },
      { member: team.f2, role: 'Frontend Developer', duty: 'Web portal integration' },
      { member: team.db, role: 'Database Developer', duty: 'Schema design, performance and data integrity' },
      { member: team.qa, role: 'QA Engineer', duty: 'Test planning, defect tracking, UAT support' },
    ],
    thresholds: { cpi: 0.9, spi: 0.9 },
  });

  const rq = {};
  const reqDefs = [
    ['SRS', 'Requirements analysis & SRS sign-off', 'Project Foundation', 'Must'], ['ARCH', 'System architecture & database design', 'Project Foundation', 'Must'],
    ['UX', 'UI/UX design system', 'Project Foundation', 'Must'], ['APPT', 'Online appointment booking & scheduling', 'Patient Appointments', 'Must'],
    ['DOC', 'Doctor roster & availability management', 'Doctor Schedules', 'Must'], ['REC', 'Patient records & laboratory reports', 'Patient Records & Lab', 'Must'],
    ['CONS', 'Online video consultation', 'Online Consultations', 'Should'], ['BILL', 'Hospital billing & invoicing', 'Billing', 'Must'],
    ['WEB', 'Web portal for five hospitals', 'Web Portal', 'Must'], ['QA', 'Integration testing & user acceptance', 'Quality Assurance', 'Must'],
    ['GO', 'Deployment & staff training', 'Rollout', 'Must'],
  ];
  for (const [k, title, module, priority] of reqDefs) rq[k] = (await M.Requirement.create({ title, module, priority, status: 'Approved' }))._id;
  await M.Requirement.create({ title: 'Pharmacy inventory integration', module: 'Pharmacy', priority: 'Could', status: 'Proposed', description: 'Requested by one hospital; not approved, so it cannot be scheduled.' });

  const ids = {};
  const actDefs = [ // key, name, req, assignee, days, deps, planned, actual, %, manual delay
    ['A1', 'Requirements analysis & SRS', 'SRS', team.pm, 10, [], 250000, 260000, 100, 0],
    ['A2', 'Architecture & database design', 'ARCH', team.db, 8, ['A1'], 300000, 310000, 100, 0],
    ['A3', 'UI/UX design', 'UX', team.f1, 10, ['A1'], 280000, 275000, 100, 0],
    ['A4', 'Appointment module', 'APPT', team.b1, 21, ['A2'], 520000, 600000, 80, 15],
    ['A5', 'Doctor schedule module', 'DOC', team.b2, 14, ['A2'], 380000, 400000, 100, 0],
    ['A6', 'Patient records & lab reports', 'REC', team.b2, 21, ['A2'], 560000, 520000, 60, 0],
    ['A7', 'Online consultation module', 'CONS', team.b1, 21, ['A4'], 480000, 170000, 30, 0],
    ['A8', 'Billing module', 'BILL', team.b2, 18, ['A5'], 450000, 330000, 70, 0],
    ['A9', 'Web portal integration', 'WEB', team.f2, 28, ['A3', 'A4'], 620000, 240000, 35, 0],
    ['A10', 'Integration testing', 'QA', team.qa, 14, ['A6', 'A7', 'A8', 'A9'], 350000, 0, 0, 0],
    ['A11', 'UAT & defect fixing', 'QA', team.qa, 10, ['A10'], 300000, 0, 0, 0],
    ['A12', 'Deployment & training', 'GO', team.pm, 8, ['A11'], 250000, 0, 0, 0],
  ];
  for (const [k, name, req, assignee, durationDays, deps, plannedCost, actualCost, percentComplete, delayDays] of actDefs)
    ids[k] = (await M.Activity.create({ name, requirement: rq[req], assignee, durationDays, dependencies: deps.map((d) => ids[d]), plannedCost, actualCost, percentComplete, delayDays }))._id;

  const crBase = { requestedBy: 'Hospital Management', status: 'Pending' };
  for (const c of [
    { title: 'Add AI-based preliminary diagnosis module', justification: 'Management wants symptom-based triage suggestions to reduce doctor workload at all five hospitals.', costImpact: 500000, scheduleImpactDays: 14,
      newRequirement: { title: 'AI preliminary diagnosis', module: 'AI Diagnosis', priority: 'Should' },
      newActivity: { name: 'AI preliminary diagnosis module', assignee: team.b2, durationDays: 14, plannedCost: 500000, dependencies: [ids.A9], successors: [ids.A10] } },
    { title: 'Add patient mobile application', justification: 'Patients asked for booking and consultations from phones; adoption will be much higher with a mobile app.', costImpact: 300000, scheduleImpactDays: 7,
      newRequirement: { title: 'Patient mobile application', module: 'Mobile App', priority: 'Should' },
      newActivity: { name: 'Patient mobile app', assignee: team.f1, durationDays: 7, plannedCost: 300000, dependencies: [ids.A9], successors: [ids.A10] } },
  ]) {
    const cr = await M.ChangeRequest.create({ ...crBase, ...c });
    const r = await M.Requirement.create({ ...c.newRequirement, status: 'Proposed', changeRequest: cr._id });
    cr.requirement = r._id; await cr.save();
  }

  await M.Defect.insertMany([
    { title: 'Double booking when two patients select the same slot simultaneously', severity: 'Critical', status: 'In Progress', assignedTo: team.b1, activity: ids.A4, description: 'Race condition in slot allocation.' },
    { title: 'Patient record update overwrites newer data (lost update)', severity: 'Critical', status: 'Open', assignedTo: team.b2, activity: ids.A6, description: 'Concurrent edits by two doctors.' },
    { title: 'Lab report PDF missing patient ID', severity: 'High', status: 'Resolved', assignedTo: team.b2, activity: ids.A6 },
    { title: 'Doctor calendar shows wrong time zone offset', severity: 'Medium', status: 'Open', assignedTo: team.b2, activity: ids.A5 },
    { title: 'Invoice total rounding mismatch', severity: 'Low', status: 'Closed', assignedTo: team.b2, activity: ids.A8 },
  ]);

  const ck = (deliverable, item, status = 'Pending', inspector, notes) => ({ deliverable, item, status, inspector, notes, inspectedAt: status === 'Pending' ? undefined : new Date('2026-10-22') });
  await M.Checklist.insertMany([
    ck('SRS Document', 'Every requirement is traceable and signed off', 'Pass', team.qa), ck('SRS Document', 'Acceptance criteria defined for each requirement', 'Pass', team.qa),
    ck('Appointment Module', 'Slot conflict validation works', 'Fail', team.qa, 'Double booking reproduced (see critical defect).'), ck('Appointment Module', 'Cancellation and rescheduling flow'),
    ck('Patient Records', 'Role-based access control verified', 'Pass', team.qa), ck('Patient Records', 'Concurrent edits are handled safely', 'Fail', team.qa, 'Lost update defect open.'),
    ck('Database', 'Backup and restore tested', 'Pass', team.db), ck('Billing Module', 'Invoice totals reconcile with services'),
  ]);

  await M.Risk.create([
    { title: 'Scope creep from hospital management', category: 'Scope', likelihood: 5, impact: 4, owner: team.pm, trigger: 'New feature requests outside the baseline', preventiveAction: 'Enforce the change request process; sponsor sign-off for every change', correctiveAction: 'Re-baseline cost and schedule, drop lower-priority requirements' },
    { title: 'Critical defects delay UAT', category: 'Quality', likelihood: 4, impact: 5, owner: team.qa, trigger: 'Critical defect open when integration testing starts', preventiveAction: 'Daily defect triage; code review on scheduling and records code', correctiveAction: 'Assign extra developer, freeze new features until fixed' },
    { title: 'Budget overrun from rework', category: 'Cost', likelihood: 4, impact: 4, owner: team.pm, trigger: 'CPI below 0.90 for two weekly reviews', preventiveAction: 'Weekly EVM review; control rework through peer review', correctiveAction: 'Request budget increase or reduce scope' },
    { title: 'Key developer unavailable', category: 'Resource', likelihood: 2, impact: 5, owner: team.pm, trigger: 'Extended leave or resignation', preventiveAction: 'Pair programming and shared documentation', correctiveAction: 'Reassign work to the other backend developer' },
    { title: 'Patient data privacy breach', category: 'Security', likelihood: 2, impact: 5, owner: team.b2, trigger: 'Penetration test finding or access-log anomaly', preventiveAction: 'Role-based access, encryption, audit logging', correctiveAction: 'Isolate system, notify hospitals, patch and re-test' },
    { title: 'Integration with legacy hospital systems fails', category: 'Technical', likelihood: 3, impact: 4, owner: team.b1, trigger: 'API test fails against hospital test servers', preventiveAction: 'Early proof of concept with each hospital', correctiveAction: 'Build adapter layer or manual data import' },
    { title: 'AI diagnosis accuracy too low', category: 'Technical', likelihood: 3, impact: 4, owner: team.b2, trigger: 'Validation accuracy below clinical target', preventiveAction: 'Doctor-reviewed validation data set', correctiveAction: 'Ship as advisory-only or defer release' },
    { title: 'Low staff adoption', category: 'Organisational', likelihood: 2, impact: 3, owner: team.pm, trigger: 'Poor attendance in training', preventiveAction: 'Hands-on training per hospital', correctiveAction: 'Extra sessions and on-site support' },
  ]);
}

module.exports = { seedDatabase };
if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/healthcare_pms')
    .then(seedDatabase).then(() => { console.log('Sample data loaded'); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
