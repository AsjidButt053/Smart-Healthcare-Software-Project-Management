# Database schema (MongoDB / Mongoose, database `healthcare_pms`)

| Collection | Key fields | Relations |
|---|---|---|
| projects (1 doc) | name, description, objectives[], stakeholders[], scopeIn/Out, approvedBudget, baselineBudget, startDate, deadline, baselineDeadline, statusDate, status, plan{scope,schedule,cost,quality}, milestones[], responsibilities[], thresholds{cpi,spi}, closure{} | – |
| requirements | title, module, description, priority (Must/Should/Could/Wont), status (Proposed/Approved/Rejected) | changeRequest → changerequests |
| activities | name, assignee, durationDays, plannedStart, plannedCost, actualCost, percentComplete, delayDays | requirement → requirements (must be Approved); dependencies[] → activities |
| changerequests | title, justification, requestedBy, costImpact, scheduleImpactDays, newRequirement{}, newActivity{}, status, decidedBy, decisionNote, decidedAt, impact{before,after} | requirement → requirements; newActivity.dependencies[]/successors[] → activities |
| defects | title, description, severity (Critical/High/Medium/Low), status (Open/In Progress/Resolved/Closed), assignedTo | activity → activities |
| checklists | deliverable, item, status (Pending/Pass/Fail), inspector, notes, inspectedAt | – |
| risks | title, category, likelihood 1-5, impact 1-5, score (= likelihood × impact, set automatically), owner, trigger, preventiveAction, correctiveAction, status | – |

Sample data: `backend/src/seed.js` (11 approved requirements, 12 activities, 2 pending change requests, 5 defects, 8 checklist items, 8 risks).
The WBS, schedule, EVM and dashboard are computed on request from these collections, so they can never disagree with the stored records.
