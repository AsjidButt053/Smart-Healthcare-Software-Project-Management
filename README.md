# Smart Healthcare Project Management and Monitoring System

A full-stack web application that lets a project manager plan, execute, monitor and control a software project in one place. It was built for the **Software Project Management** case study of a five-hospital Smart Healthcare system (16 weeks, PKR 5,000,000 budget) and covers scope, schedule, cost, quality and risk with persistent storage and an interactive interface.

## Features

The system is organised into six modules that share one database and one dashboard.

| # | Module | What it does |
|---|--------|--------------|
| 1 | **Project Initiation and Integration** | Project charter, management plan (scope, schedule, cost, quality), stakeholders, milestones, responsibilities, status settings and controlled project closure |
| 2 | **Scope Management and WBS** | Requirements register with MoSCoW priorities and approval states, auto-generated Work Breakdown Structure with cost roll-up, formal change request workflow |
| 3 | **Schedule and Resource Management** | Activities with dependencies and owners, forward and backward pass, delay detection and propagation, critical path, float and Gantt chart |
| 4 | **Cost Management and EVM** | Planned and actual cost tracking, Earned Value indicators (PV, EV, AC, CPI, SPI, CV, SV, BAC, EAC, ETC, VAC) and automatic threshold warnings |
| 5 | **Quality and Risk Control** | Defect log, quality checklist with inspection results, prioritization matrix, Process Decision Program Chart (PDPC) and risk register |
| 6 | **Integration, Validation and Reporting** | Single dashboard, consistency rules between modules, input validation and central error handling |

### Key business rules

- Only **Approved** requirements can have activities scheduled against them.
- Scope, schedule and budget changes go through a **change request**; approving one stores a before/after impact snapshot.
- Circular dependencies between activities are detected and rejected with a descriptive error.
- A project cannot be closed while activities are incomplete, critical defects are unresolved or change requests are pending.
- Risk score is calculated automatically as likelihood x impact.
- CPI and SPI warning thresholds are configurable (default 0.90).

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router, Vite, CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Testing | Node.js built-in test runner |

## Architecture

A three-tier design: the React app calls the Express REST API under `/api`, which validates requests, applies business rules and reads or writes MongoDB through Mongoose models. During development the Vite dev server proxies `/api` calls to the backend on port 5000.

The scheduling and EVM logic lives in pure functions (`schedule.js`, `evm.js`) that take plain data and return results without touching the database. The WBS, schedule, EVM figures and dashboard are computed on every request from the stored records, so they always agree with the data.

## Project structure

```
backend/
  src/
    models/index.js     Mongoose schemas (project, requirements, activities, change requests, defects, checklist, risks)
    lib/schedule.js     Topological sort, cycle detection, forward/backward pass, delay propagation, critical path
    lib/evm.js          PV, EV, AC, CPI, SPI, CV, SV, EAC, ETC, VAC and threshold warnings
    lib/state.js        Loads data, runs the engines and builds the dashboard summary
    routes/api.js       REST endpoints and business rules
    server.js           Express setup, MongoDB connection, central error handler
    seed.js             Case-study sample data and reset function
  tests/logic.test.js   Automated tests for the calculation engines
frontend/
  src/pages/            Dashboard, Initiation, Scope, Schedule, Cost, Quality and Risks screens
  src/ui.jsx            Shared components: table, form dialog, tabs, badges, alerts, toasts
```

## Getting started

### Prerequisites

- Node.js 18 or later and npm
- MongoDB (a local installation or a free MongoDB Atlas cluster)

### 1. Start the backend

```bash
cd backend
npm install
npm start
```

If MongoDB is not running on localhost, edit `.env` and set `MONGO_URI` (for Atlas, paste your connection string). When the database is empty, the case-study sample data is loaded automatically. The API runs on `http://localhost:5000`.

### 2. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

### 3. Run the tests

```bash
cd backend
npm test
```

### 4. Reset the sample data

Use the **Reset sample data** button in the sidebar, or run `npm run seed` in the `backend` folder.

## Sample data

The seed data reproduces the case study so results are repeatable. The status date is 26 October 2026 and the project runs from 7 September 2026 to a deadline of 27 December 2026. It includes 12 activities, 11 approved and 3 proposed requirements, 2 pending change requests (an AI-based preliminary diagnosis module and a mobile app), 5 defects, 8 quality checklist items and 8 risks. With this data the dashboard reports **CPI 0.85** and **SPI 0.82**, and raises danger warnings because both fall below the 0.90 threshold.

## REST API

| Method and path | Purpose |
|-----------------|---------|
| `GET, PUT /api/project` | Read and update charter, plan, status, milestones, responsibilities, thresholds |
| `POST /api/project/close` | Close the project after validation |
| `GET, POST /api/requirements`; `PUT, DELETE /api/requirements/:id` | Requirements management |
| `GET /api/wbs` | Generated WBS with cost roll-up |
| `GET, POST /api/activities`; `PUT, DELETE /api/activities/:id` | Activities, costs and progress |
| `GET /api/schedule` | Computed schedule, delays, impact, critical path, milestones |
| `GET /api/evm` | Computed EVM indicators and warnings |
| `GET, POST /api/change-requests` | List and create change requests |
| `POST /api/change-requests/:id/decision` | Approve or reject a pending change request |
| `DELETE /api/change-requests/:id` | Delete a pending change request |
| `GET, POST /api/defects`; `PUT, DELETE /api/defects/:id` | Defect tracking |
| `GET, POST /api/checklist`; `PUT /api/checklist-inspect/:id` | Quality checklist and inspection results |
| `GET, POST /api/risks`; `PUT, DELETE /api/risks/:id` | Risk register |
| `GET /api/dashboard` | Dashboard summary |
| `POST /api/admin/seed` | Reset to the case-study sample data |

## Limitations

- Durations are in calendar days; working-day calendars and public holidays are not modelled.
- Only finish-to-start dependencies are supported, without lead or lag.
- There is no login or role-based access; the system assumes a single project manager.
- It manages one project at a time.

## Author

**Muhammad Asjid Butt** (CIIT/FA23-BSE-053/SWL)
BS Software Engineering, COMSATS University Islamabad, Sahiwal Campus
Supervisor: Mr. Bilal Shabbir Qaisar
