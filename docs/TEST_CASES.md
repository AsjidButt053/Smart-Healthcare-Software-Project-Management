# Test cases

## A. Automated unit tests (`cd backend && npm test`). Actual results from the run: 8 of 8 passed.
| ID | Scenario | Expected | Actual |
|---|---|---|---|
| TC-01 | Two finish-to-start activities of 10 days from 1 Jan | B starts 11 Jan, project ends 20 Jan, deadline met | As expected (Pass) |
| TC-02 | Activity A reports 3 days delay | A ends 13 Jan, B starts 14 Jan, finish 23 Jan, 3 days late, B listed as impacted | As expected (Pass) |
| TC-03 | Status date 25 Jan, B unfinished and baseline end 20 Jan | B slip 5 days automatically, finish 25 Jan, deadline missed | As expected (Pass) |
| TC-04 | A depends on B and B depends on A | Error "Circular dependency detected" | As expected (Pass) |
| TC-05 | EVM at 15 Jan (A 100%, B 50%, AC 1,600) | BAC 2000, PV 1500, EV 1500, AC 1600, CPI 0.94, SPI 1.0, CV -100, SV 0, EAC 2133.33 | As expected (Pass) |
| TC-06 | Actual cost of B raised to 1,500 | CPI below 0.9, danger warning "Cost overrun" | As expected (Pass) |
| TC-07 | Approved budget equal to BAC but forecast higher | Warning that forecast exceeds approved budget | As expected (Pass) |
| TC-08 | New activity added before B (approved change) | Planned cost +500, baseline finish moves to 25 Jan | As expected (Pass) |

## B. Case-study calculation (seed data, status date 26 Oct 2026), verified with the same engine
| Check | Expected | Actual |
|---|---|---|
| Before changes: BAC / PV / EV / AC | 4,740,000 / 3,235,000 / 2,638,000 / 3,105,000 | Same |
| Before changes: CPI / SPI | 0.85 / 0.82 (both below 0.90 threshold, warnings shown) | Same |
| Before changes: forecast (EAC) vs budget | 5,579,113 exceeds 5,000,000 by 579,113 | Same |
| Before changes: projected finish | 29 Dec 2026, 2 days after deadline 27 Dec | Same |
| After approving both change requests | Planned cost 5,540,000; approved budget 5,800,000; deadline +21 days (17 Jan 2027); new finish 12 Jan 2027 | Same |

## C. System tests through the UI (record your actual result during the demo)
| ID | Steps | Expected | Actual |
|---|---|---|---|
| ST-01 | Schedule → Add activity, requirement "Pharmacy inventory integration" | Refused: requirement is Proposed, raise a change request | |
| ST-02 | Add an activity whose cost pushes total above PKR 5,000,000 | Refused with budget message | |
| ST-03 | Edit an activity to depend on its own successor | Refused: circular dependency | |
| ST-04 | Scope → Change requests → Approve "AI diagnosis" | Budget +500,000, deadline +14 days, requirement Approved, new activity in WBS and Gantt, before/after panel shown | |
| ST-05 | Approve the same request again | Not offered; API returns "already Approved" | |
| ST-06 | New change request with justification under 10 characters | Validation message | |
| ST-07 | Cost → Update progress with % complete 120 | Rejected by validation | |
| ST-08 | Set CPI threshold to 0.95 in Charter & Plan → Update status | More severe cost warning on Dashboard | |
| ST-09 | Close project while critical defects are open | Refused, reasons listed | |
| ST-10 | Mark checklist item Pass without inspector | Refused, inspector required | |
| ST-11 | Delete a requirement that has activities | Refused | |
| ST-12 | Risks → Add risk with likelihood 6 | Rejected (must be 1 to 5) | |
