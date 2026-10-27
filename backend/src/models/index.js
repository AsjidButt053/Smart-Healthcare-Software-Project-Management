const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const opts = { timestamps: true };
const Ref = (name) => ({ type: Schema.Types.ObjectId, ref: name });

const Project = model('Project', new Schema({
  name: { type: String, required: true }, description: String,
  objectives: [String],
  stakeholders: [{ name: String, role: String, interest: String }],
  scopeIn: String, scopeOut: String,
  approvedBudget: { type: Number, required: true, min: 1 }, baselineBudget: Number,
  startDate: { type: Date, required: true }, deadline: { type: Date, required: true }, baselineDeadline: Date,
  statusDate: Date,
  status: { type: String, enum: ['Initiating', 'Planning', 'Executing', 'Monitoring', 'Closed'], default: 'Executing' },
  plan: { scope: String, schedule: String, cost: String, quality: String },
  milestones: [{ name: String, date: Date, done: { type: Boolean, default: false } }],
  responsibilities: [{ member: String, role: String, duty: String }],
  thresholds: { cpi: { type: Number, default: 0.9 }, spi: { type: Number, default: 0.9 } },
  closure: { isClosed: { type: Boolean, default: false }, closedAt: Date, acceptedBy: String, lessonsLearned: String },
}, opts));

const Requirement = model('Requirement', new Schema({
  title: { type: String, required: true }, module: { type: String, required: true }, description: String,
  priority: { type: String, enum: ['Must', 'Should', 'Could', 'Wont'], default: 'Should' },
  status: { type: String, enum: ['Proposed', 'Approved', 'Rejected'], default: 'Proposed' },
  changeRequest: Ref('ChangeRequest'),
}, opts));

const Activity = model('Activity', new Schema({
  name: { type: String, required: true }, requirement: { ...Ref('Requirement'), required: true },
  assignee: { type: String, required: true },
  durationDays: { type: Number, required: true, min: 1 }, plannedStart: Date, dependencies: [Ref('Activity')],
  plannedCost: { type: Number, required: true, min: 0 }, actualCost: { type: Number, default: 0, min: 0 },
  percentComplete: { type: Number, default: 0, min: 0, max: 100 }, delayDays: { type: Number, default: 0, min: 0 },
}, opts));

const ChangeRequest = model('ChangeRequest', new Schema({
  title: { type: String, required: true }, description: String, justification: { type: String, required: true },
  requestedBy: String, costImpact: { type: Number, default: 0, min: 0 }, scheduleImpactDays: { type: Number, default: 0, min: 0 },
  newRequirement: { title: String, module: String, priority: String, description: String },
  newActivity: { name: String, assignee: String, durationDays: Number, plannedCost: Number, dependencies: [Ref('Activity')], successors: [Ref('Activity')] },
  requirement: Ref('Requirement'),
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  decidedBy: String, decisionNote: String, decidedAt: Date, impact: Schema.Types.Mixed,
}, opts));

const Defect = model('Defect', new Schema({
  title: { type: String, required: true }, description: String,
  severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
  assignedTo: { type: String, required: true }, activity: Ref('Activity'),
}, opts));

const Checklist = model('Checklist', new Schema({
  deliverable: { type: String, required: true }, item: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Pass', 'Fail'], default: 'Pending' },
  inspector: String, notes: String, inspectedAt: Date,
}, opts));

const riskSchema = new Schema({
  title: { type: String, required: true }, category: String,
  likelihood: { type: Number, min: 1, max: 5, required: true }, impact: { type: Number, min: 1, max: 5, required: true },
  score: Number, owner: String, trigger: String, preventiveAction: String, correctiveAction: String,
  status: { type: String, enum: ['Open', 'Mitigating', 'Occurred', 'Closed'], default: 'Open' },
}, opts);
riskSchema.pre('validate', function (next) { this.score = this.likelihood * this.impact; next(); });
const Risk = model('Risk', riskSchema);

module.exports = { Project, Requirement, Activity, ChangeRequest, Defect, Checklist, Risk };
