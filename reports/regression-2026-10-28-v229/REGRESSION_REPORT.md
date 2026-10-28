# Regression report — 28 October 2026

Target: https://api.rcbmatka.com and https://payment.rcbmatka.com. All executions used the configured test player. TLS verification remained enabled using the Windows trusted certificate store.

## Result

Latest evidence across the full retest and focused contract retest: **149 requests, 148 passed, 1 failed, 0 skipped**. This is a consolidated result, not a new single full-suite run. The production regression is not fully green.

| Run | Requests | Passed | Failed |
| --- | ---: | ---: | ---: |
| api-execution-report.json | 149 | 123 | 26 |
| retest/api-execution-report.json | 149 | 143 | 6 |
| contract-retest/api-execution-report.json | 11 | 11 | 0 |

## Master-suite comparison

The current master had 351 rows; the supplied master had 637. Comparison used stable Test_Case_ID values and all 12 columns, not endpoint alone. 286 cases were missing and were added. 91 existing rows had source changes: 21 expected-result updates, 24 status updates and 91 remarks updates (these overlap). Prior values are retained in suite-comparison.json and relevant master remarks. No old-only case was discarded.

The 22 new checklist scenarios were also added, producing **659 unique master cases** in the sole canonical file: [APK_API_master_Testcase_suite.csv](../APK_API_master_Testcase_suite.csv). Historical test cycles remain labelled; historical passes are not represented as newly rerun cases.

The merged Postman collection has 197 requests: original IDs 1–111 preserved, checklist IDs 112–133, and 64 additional probes at 134–197 for 12 master cases. These include all 38 unauthenticated session-middleware routes and all 7 routes that check sessions themselves. Multi-request cases pass only if every implemented variant passes.

## Open regression finding

- **REG-229-001 — 22 · P3 · The same order opened twice (request 133)**. HTTP 200. Failed checks: Duplicate order verdict; Duplicate reason; Duplicate title; Duplicate explanation. Expected duplicate_order / duplicate and the title “Payment could not be started”, with the repeat-payment explanation. Reproduced in both full runs. See the sanitized response in retest/api-execution-report.json. The HTML did not contain the required duplicate-refusal explanation. This records an observed response-contract failure; whether a second PG order was created is not established without server/payment records.

## Verified new behaviour

- Favourites: list/count messages, add, duplicate add, insertion order, invalid requests, no-session refusal, remove, duplicate remove, sync filtering, and cleanup. The complete original favourites list was restored in both full runs.
- Main-market, Starline and Jackpot declaration timestamps were checked against their result states for every returned market.
- Add Funds: inline SVG QR, entered amount, QR/UPI controls, gateway verdict/reference, and a matching pending deposit passed. P2 (gateway unavailable) was unit-tested but not observed live because the PG returned ok. P3 duplicate handling remains failed.
- Two full payment flows were executed, starting two unpaid orders. No payment was completed, no bet was placed and no withdrawal was requested. Unpaid pending records were retained as evidence.

## Framework corrections made during regression

- Current master expectations supersede old snapshots: settings expose only the documented app fields; withdrawal limits are numeric; payment channels omit bank/staff details; removed routes return JSON 404.
- Fixed explicit assertion overrides retaining stale inferred schemas, corrected the profile’s top-level bonus/withdrawal fields, authenticated getway-list, and removed database version metadata from inferred required fields. Bid-history checks use documented history fields rather than treating a win-only field as required on pending rows.
- Added explicit ports of the 22 supplied Postman tests, prerequisite handling, runtime variable capture, and write guards for GET payment requests. Original supplied Postman test scripts remain in the merged collection.

## Remaining coverage and blockers

The 286 new master cases plus 22 checklist cases have these current dispositions: PASS: 34; NOT RUN: 199; BLOCKED - STAGING REQUIRED: 74; FAIL: 1. A successful endpoint smoke test is not counted as execution of every boundary or state variant in the master.

Cases needing staging include rate-limit lockouts, blocked/deleted players, geo/IP configuration, staff-controlled settlement and restricted data states. Other unrun cases need additional accounts, genuine expired tokens, specific existing deposits, or stateful workflows. Wallet-moving bids/withdrawals and credential changes were excluded. See coverage-and-blockers.json and the master Actual_Result column for case-by-case disposition. No unexecuted case is marked passed.

## Evidence and rerun

- final-execution-report.json / .pdf: latest response evidence for all 149 selected requests.
- api-execution-report.json / .pdf: untouched first run; retest/: second full run; contract-retest/: 11 focused probes.
- suite-comparison.json: added IDs and exact before/after field corrections.
- coverage-and-blockers.json: all 308 new-case dispositions and run summaries.

```powershell
$env:NODE_USE_SYSTEM_CA='1'
npm run test:framework
npm run test:regression -- --dry-run
npm run test:regression -- --allow-writes --output-dir reports/<new-cycle>
```

A write-enabled regression changes the test player’s favourites temporarily, replaces their login session, and starts an unpaid payment order. Use a new output directory to preserve prior execution evidence. The ordinary read-only guard remains available; staging-only and wallet-moving cases require their prerequisites before separate execution.


## NEW-022 revised-scope retest

Per the user’s revised requirement, NEW-022 now uses a fresh unique order ID and amount INR 600, with HTTP 200 as its pass condition. The isolated retest returned HTTP 200: **PASS**. Order ID: 1793181535977125. Only the login/profile prerequisites and NEW-022 were executed. Payment completion and PG success were not asserted.

Evidence: new022-600-retest/api-execution-report.json and .pdf. The master suite reflects this revised scope. Earlier consolidated totals remain historical results under the original duplicate-order assertions. REG-229-001 was not retested under its original criteria and is not established as fixed.
