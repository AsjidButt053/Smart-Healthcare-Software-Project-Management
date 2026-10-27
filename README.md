# Smart Healthcare Project Management System
CSE-494 Software Project Management · React.js + Node.js/Express + MongoDB

A working project-management application for the five-hospital Smart Healthcare case study
(16 weeks, PKR 5,000,000 budget, +PKR 800,000 / +3 weeks from the AI diagnosis and mobile app changes).

## Run it (3 steps)
Requirements: Node.js 18+ and MongoDB (local install, or a free MongoDB Atlas cluster).

```bash
# 1. Backend  (terminal 1)
cd backend
npm install
# edit .env if your MongoDB is not on localhost (Atlas: paste your connection string into MONGO_URI)
npm start            # loads the case-study sample data automatically on first run

# 2. Frontend (terminal 2)
cd frontend
npm install
npm run dev          # open http://localhost:5173
```
Useful commands: `npm run seed` (reset sample data, backend), `npm test` (unit tests, backend), `npm run build` (frontend).
The sidebar button **Reset sample data** also restores the demo state at any time.

## Modules and where they live
| # | Module | Screen | Backend |
|---|--------|--------|---------|
| 1 | Initiation & integration (charter, plan, status, milestones, responsibilities, closure) | Charter & Plan | `PUT /api/project`, `POST /api/project/close` |
| 2 | Scope & WBS (requirements, WBS, change requests) | Scope & Changes | `/api/requirements`, `/api/wbs`, `/api/change-requests` |
| 3 | Schedule & resources (dependencies, delays, critical path, Gantt) | Schedule | `/api/activities`, `/api/schedule`, `src/lib/schedule.js` |
| 4 | Cost & EVM (PV, EV, AC, CPI, SPI + CV, SV, EAC, ETC, VAC, warnings) | Cost & EVM | `/api/evm`, `src/lib/evm.js` |
| 5 | Quality & risk (defects, checklist, prioritization matrix, PDPC) | Quality, Risks | `/api/defects`, `/api/checklist`, `/api/risks` |
| 6 | Integration, validation, reporting | Dashboard | `/api/dashboard`, error handler in `server.js` |

## Suggested demonstration script (about 5 minutes)
1. **Dashboard**: warnings show CPI 0.85, SPI 0.82, forecast over budget, finish 2 days after deadline, 2 critical defects, 2 pending change requests.
2. **Scope → Requirements**: "Pharmacy inventory integration" is Proposed. Try to schedule it in **Schedule → Add activity**: the system refuses (unapproved requirement).
3. **Schedule**: the Appointment module is delayed 15 days; the delay impact table lists the dependent activities that are pushed out; the Gantt shows baseline vs current bars, critical path and the deadline line.
4. **Scope → Change requests**: approve "AI diagnosis module" and "Mobile application". Each approval shows a before → after panel: approved budget 5.0M → 5.8M, deadline +21 days, new requirements and activities appear in the WBS and Gantt, and EVM planned cost rises by PKR 800,000.
5. **Cost & EVM → Update progress**: change an activity's actual cost and watch CPI/SPI and warnings recalculate.
6. **Quality / Risks**: resolve a critical defect, record a checklist result, open the Prioritization matrix and the PDPC.
7. **Charter → Close project** is refused with clear reasons until all conditions are met.

## Business rules enforced by the backend
- An activity can only deliver an **Approved** requirement; requirements with activities cannot be un-approved or deleted.
- Total planned activity cost can never exceed the approved budget (raise a change request instead).
- Dependency cycles are rejected; deleting an activity removes it from other activities' dependencies.
- Approving a change request atomically raises budget and deadline, approves its requirement, creates its activity, rewires successors, and stores a before/after snapshot.
- Decided change requests are kept as an audit record and cannot be deleted.
- Closure needs 100% progress, no unresolved critical defects, no pending change requests and an acceptor.

## Calculation notes
- Schedule: calendar days. Forward pass gives start/end from dependencies; slip = max(reported delay, days an unfinished activity is past its baseline end); backward pass gives float, critical path and downstream impact.
- EVM (as of the *status date* set in Charter & Plan): PV = planned cost × planned fraction elapsed (linear over the baseline dates), EV = planned cost × % complete, AC = actual cost, CPI = EV/AC, SPI = EV/PV, EAC = BAC/CPI.
- Warnings: danger below the CPI/SPI threshold (default 0.90), warning below 1.0, danger if EAC or planned cost exceeds the approved budget.

See `docs/DATABASE_SCHEMA.md` and `docs/TEST_CASES.md` for submission material. Screenshots must be taken from your running copy.
