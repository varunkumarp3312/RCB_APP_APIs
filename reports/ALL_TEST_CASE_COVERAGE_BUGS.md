# All Test Case Coverage — Bugs and Limits

**Date:** 2026-10-26  
**Environment:** Production player API, `https://api.rcbmatka.com`  
**Execution report:** [ALL_TEST_CASE.md](./ALL_TEST_CASE.md)  
**Execution data:** `updated-api-test-execution-report.json`

## Execution coverage

- **57 checks:** 57 passed, 0 failed.
- Included one authorized login, positive read flows, negative validation
  responses, pagination boundaries, response-shape/type checks, and safe
  authentication checks.
- Authentication/security checks were limited to missing and forged tokens and
  response-field minimization. No exploit payloads, fuzzing, credential
  guessing, cross-account access, load testing, or state-changing financial
  requests were run against production.
- Financial and account values are redacted in the attached execution report.

## Bug and requirement coverage

| Reference | Area | Result | What was actually checked |
|---|---|---|---|
| A1 / R2-BUG-06 | Bid-screen stake limits | **PARTIAL** | `GET /api/my-game-rates` and three market rate-limit endpoints responded successfully. Production test player used standard rates; per-player custom rates and validation on 12 app screens require a configured test player and new APK. No bids were placed. |
| A2 / R2-BUG-04 | Staff-field exposure | **PASS** | Withdrawal history and both bank-list endpoints omitted the specified payout/reviewer staff fields. |
| A3 / R2-BUG-01 | Pana 344 | **PASS** | All five `POST /api/number-list` types returned expected counts; Half/Full Sangam each had 220 unique entries including 344. |
| R1-BUG-01 / R2-BUG-02 | Withdrawal limits | **PASS** | Profile and withdrawal-permission values/source matched and had numeric types. Limit acceptance/refusal and withdrawal submission were not attempted. |
| R1-BUG-02 / R2-BUG-03 | Deposit limit | **API PASS; payment flow NOT RUN** | `GET /api/getway-list` returned effective min/max and deposit limits of 100/49,999. No payment page or real transaction was used. |
| R1-BUG-03 | Jackpot order | **PASS** | 13 Jackpot draws were in chronological order, beginning at 10:00 AM, with `Asia/Kolkata` timezone and server time. |
| R1-BUG-04 | Retired result-history route | **PASS — sample** | Starline result-history endpoint returned a JSON 404. Other retired market-result routes were not all individually requested. |
| R1-BUG-05 / R1-BUG-09 | Historical Passbook repairs | **NOT RUN** | Repair script requires explicit owner approval; no repair or historic-data update was performed. |
| R1-BUG-06 | Support-photo conversation flow | **PARTIAL** | Read-only support-chat response contained a descriptive `note`; send, close, and photo workflows were not run. |
| R1-BUG-07 | Bank replacement workflow | **NOT RUN** | Bank details were not changed and no admin approval/decline was triggered. |
| R1-BUG-08 | Postman business assertions | **FAIL — local artifact stale** | Current local collection has 111 requests. All have test scripts, but none use `pm.expect` or the expected business/refusal assertions; 13 scripts parse JSON only to save variables. The requested new 89-request collection is absent. |
| R1-BUG-10 / R2-BUG-10 | Support-number configuration | **PASS / CONFIGURATION** | Settings and all three support endpoints reflected that no number is switched on and returned documented no-number responses. |
| R1-BUG-11 / C4 | Market status and time metadata | **PASS for API shape; PARTIAL for result selection** | Main, Starline, and Jackpot lists included server time, timezone, phase, and bidding fields. A multiple-result same-day market was not available; query-count optimization cannot be proven from black-box responses. |
| R1-BUG-12 | Login/profile balance agreement | **PASS — point in time** | Login and immediate profile responses had matching balances. Values are redacted in the report. |
| R2-BUG-05 | Geo headers and 451 UI | **NOT RUN** | Needs new APK and isolated test geo configuration. Live geo restriction was not changed. |
| R2-BUG-07 | Invalid username response | **NOT RUN in this run** | Would require a profile mutation request; use a disposable test account. A prior test report contains a rejected short-username check, but it is not counted in today's 57 checks. |
| R2-BUG-08 | Empty bank/Passbook states | **PARTIAL** | Approved-bank list returned a successful empty list; regular bank list and Passbook had records. No empty-ledger account was available. |
| R2-BUG-09 / C2 | Session checks | **PASS — focused** | Current run confirmed a missing session returns 401 for `getway-list` and profile, and a forged token returns 401 for profile. A previous retest separately checked 13 protected read routes. Expired signed token and blocked-account cases were not exercised today. |
| R2-BUG-11 | Notice ordering | **INCONCLUSIVE** | One notice was returned; order cannot be established with one record. |
| R2-BUG-12 | Video titles | **PASS** | Video-list response included titles as strings. |
| R2-BUG-13 | Invalid number-list type | **PASS** | Unknown type returned the expected refusal; malformed JSON returned HTTP 400 with a JSON error. |
| R2-BUG-14 | App Setting allowlist | **PASS** | `app-setting-list`, contact settings, and profile `settingData` each matched the allowed `_id` plus 15 app fields. |
| R2-BUG-15 / C3 | History pages and win total | **PASS for shape/edges; page-3 win sample unavailable** | Main, Starline, Jackpot histories had paging metadata; page zero/string/beyond-end/no-match cases behaved as expected. Win total was numeric; this player had only one matching win page. |
| R2-BUG-16 | Passbook paging and totals | **PASS** | Pages 1/2, all/credit/debit filters, beyond-end page, stable aggregates, and legacy no-page behavior were checked. |
| C1 | Removed paths and malformed JSON | **PASS — representative samples** | Five removed routes returned JSON 404; malformed JSON returned HTTP 400. Not all 24 removed paths were individually probed. |
| C5 | Admin deposit-routing UI | **NOT RUN** | Requires the deployed admin console and authorized admin account. |
| C6 | Payment-provider email / real payin-payout | **NOT RUN** | Requires payment-service access and sandbox/approval. No funds were moved. |
| C7 | Human-readable API messages | **PARTIAL** | Representative response messages and support-chat `note` were checked, not all 57 app routes. |
| C8 | Small validation fixes | **PARTIAL** | Unknown notification type was refused. Other safe/unsafe validation cases (missing FCM token, bank IFSC, account edits) were not run against the production account. |

## Test types covered

| Test type | Coverage |
|---|---|
| Positive | Login, profile, markets, settings, rates, contacts, number lists, withdrawal limits, payment channels, histories, Passbook, notifications, referral, timetable, game rates, and videos. |
| Negative / boundary | Unknown number-list type, unsupported notification type, malformed JSON, page 0, string page number, beyond-end page, unmatched market filter, no-token access, forged-token access, removed endpoint paths. |
| Integration / flow | Login → authenticated profile/settings → market/rates → account/history/Passbook reads, with response data reused through the Postman runtime. |
| Data validation | JSON shape, array/list counts, unique pana values, pagination/count/totals presence, channel allowlist, settings allowlist, numeric limit fields, market time-zone/status fields. |
| Generic response contract | HTTP status, `success` outcome, meaningful `message` or `note`, JSON error body for malformed JSON and removed routes. |
| Security (safe production checks) | Authentication required on protected profile/payment-channel reads; invalid token rejected; payment channel fields minimized; public settings allowlisted. No exploit attempts. |

## Not covered / next safe steps

1. Import the updated 89-request collection with business assertions, then run
   it against staging or an approved isolated test environment.
2. Use disposable accounts to test per-player rates, empty bank/Passbook states,
   username refusal, bank approval, support conversations, and 451 UI.
3. Use payment sandbox and approved non-production credentials for payment
   integration tests. Do not send real deposits or payouts just to verify email
   formatting.
4. Obtain owner approval before any historical Passbook repair.
5. Schedule a separate authorized security assessment in staging. Production
   exploit testing, fuzzing, brute force, and load testing were not performed.
