# QA Retest — All Resolved Bugs

**Retest date:** 2026-10-26  
**Target:** Live player API at `https://api.rcbmatka.com`  
**Source checklist:** `25. QA-RETEST-ALL-RESOLVED-BUGS.md`  
**Overall:** The player API fixes tested here are largely working. The local
Postman collection is stale. App, admin-console, payment-provider, and
historical-repair checks require separate builds, access, or approval.

## Test approach

- Used the configured test player and a fresh login for authenticated reads.
- Exercised read-only routes and validation cases that returned refusals.
- Did **not** place bids or withdrawals, alter bank details, create/close support
  conversations, make real deposits/payouts, run repair scripts, or change live
  geo/contact settings.
- No credentials, tokens, account numbers, or personal contact details are
  included in this report.

## Results by reference

| Ref | Result | Endpoints / evidence |
|---|---|---|
| **A1 — Bid-screen stake limits** | **PARTIAL** | `GET /api/my-game-rates` returned standard per-game min/max rate data. No player-specific rates were configured for this test player, and app stake entry/validation needs the new APK. Bid placement was not attempted. |
| **A2 — Staff details in withdrawal and bank lists** | **PASS** | `GET /api/withdraw-request-list`, `POST /api/withdraw-list-bank-account`, and `POST /api/withdraw-list-bank-account-success` returned without the listed payout-staff or bank-reviewer fields. |
| **A3 — Pana 344** | **PASS** | `POST /api/number-list` returned the expected 120/90/10/220/220 unique entries for single/double/triple/half/full pana; both Sangam lists included `344`. |
| **R1-BUG-01 / R2-BUG-02 — Withdrawal limits** | **PASS** | `GET /api/get-profile-usser` and `POST /api/withdraw-manage-permission` agreed: source `app`, min 1, max 5,000, daily count 30. No withdrawal requests were submitted. |
| **R1-BUG-02 / R2-BUG-03 — Deposit maximum** | **API PASS; payment flow NOT TESTED** | Authenticated `GET /api/getway-list` returned `deposit_limits` 100–49,999 and channel `effective_min`/`effective_max` 100/49,999. The payment-page validation needs the app/payment build; no real deposit was made. |
| **R1-BUG-03 — King Jackpot ordering** | **PASS** | `GET /api/kingjackport-market-list` returned 13 draws in chronological order, starting with “Jackpot 10:00 AM”; response included server time and `Asia/Kolkata`. |
| **R1-BUG-04 — Retired result-history routes** | **PASS — representative route** | `POST /api/kingstarline-market-result-history` returned JSON 404 with the documented route/method message. Other removed result-history routes were not individually called. |
| **R1-BUG-05 / R1-BUG-09 — Old Passbook rows** | **NOT TESTED** | Historical repair was not run; the checklist says owner approval is required. New refund/deposit rows require controlled admin actions and were not created. |
| **R1-BUG-06 — Support photo conversation note** | **PARTIAL** | Read-only `GET /api/support-chat` returned a descriptive `note` and no `error` field. Send/close/photo flows were not exercised because they create or close support conversations. |
| **R1-BUG-07 — Approved bank replacement flow** | **NOT TESTED** | Requires changing bank details and admin approval/decline. The bank-list read endpoints were checked for staff-field leakage only. |
| **R1-BUG-08 — Postman business assertions** | **FAIL — local collection stale** | Local `player-app-api.postman_collection.json` contains 111 requests, not the expected 89; 16 are labelled old/retired/closed. All 111 scripts test HTTP status, but none use `pm.expect` or the required business-result/refusal assertions. Thirteen parse JSON to capture variables only. The required refreshed collection is not present in this workspace. |
| **R1-BUG-10 — Support contact configuration** | **PASS / CONFIGURATION** | The live configuration has no support number switched on; the API returns the documented no-number answers. This is a setting, not a defect. |
| **R1-BUG-11 — Market “Running Now” status** | **PASS** | `GET /api/main-market-list`, `/api/kingstarline-market-list`, and `/api/kingjackport-market-list` returned `server_time`, `Asia/Kolkata`, and the new phase/bidding/status fields. At the sampled time, an evening main-market draw was `upcoming` with open and close bidding windows. |
| **R1-BUG-12 — Login/profile balance discrepancy** | **PASS** | Test-player login and immediate profile read returned the same balance (3,341). This is a point-in-time comparison only. |
| **R2-BUG-05 — Geo headers and blocked-region UI** | **NOT TESTED** | Requires the new mobile build and a test environment with geo restriction enabled. Live geo restriction was not changed. |
| **R2-BUG-06 — Player-specific stake limits** | **PARTIAL** | Same API evidence as A1; no player with individualized rates or updated APK was available. |
| **R2-BUG-07 — Username refusal** | **PASS** | `POST /api/update-user-profile` with username `ab` returned HTTP 200, `success: "0"`, and `Username must be at least 3 characters`. |
| **R2-BUG-08 — Empty bank / Passbook states** | **PARTIAL** | Approved-bank list returned `success: "1"` and an empty array. Regular bank list had an account and Passbook had entries, so the no-bank and no-entry cases were unavailable. |
| **R2-BUG-09 — Session-protected reads** | **PASS — partial scope** | No-token requests to 13 protected read endpoints returned HTTP 401; a forged token also returned 401. All 13 endpoints are listed below. Blocked-account and signed-but-expired-token cases were not available. |
| **R2-BUG-10 — No switched-on support number** | **PASS** | `GET /api/app-setting-list`, `POST /api/front-user-contact-us`, and profile `settingData` had empty support-number fields. `/api/support-contacts`, `/api/support-whatsapp`, and `/api/onboarding-whatsapp` each returned the documented `success: "2"` no-number response. |
| **R2-BUG-11 — Notice ordering** | **INCONCLUSIVE** | `POST /api/user-notice-board` returned one notice and the “newest first” message. A single notice cannot prove sort order. |
| **R2-BUG-12 — Video titles** | **PASS** | `POST /api/video-list` returned a titled video. |
| **R2-BUG-13 — Unknown number-list type** | **PASS** | `POST /api/number-list` with `type: "abc"` returned the documented refusal immediately. |
| **R2-BUG-14 — Public settings allowlist** | **PASS** | `GET /api/app-setting-list`, `POST /api/front-user-contact-us`, and profile `settingData` each contained only the allowed `_id` plus 15 app fields. The earlier retest that treated `_id` as extra was corrected; the new checklist explicitly allows it. |
| **R2-BUG-15 — Win History paging/total** | **PARTIAL** | The three bet-history endpoints returned page metadata; all three returned numeric `total_win_amount`. For this player, page 3 of main-market wins was beyond the end (one win page), so the checklist’s page-3-with-three-pages case could not be reproduced. |
| **R2-BUG-16 — Passbook paging** | **PASS** | `POST /api/passbook-list` returned 20 rows for pages 1 and 2, stable whole-ledger counts/totals, working `all`/`credit`/`debit` filters, an empty page-99 response, and all 141 rows when called without a page. |
| **C1 — Removed routes and malformed JSON** | **PASS — representative samples** | Removed POST routes `/api/kingstarline-market-result-history`, `/api/active-chat`, `/api/submit-idea`, `/api/register-step1`, and `/api/deposit-status` returned JSON 404. Malformed JSON to `/api/number-list` returned HTTP 400 and the documented JSON error. Not every removed route was individually probed. |
| **C2 — `getway-list` authentication/privacy** | **PASS** | Authenticated `GET /api/getway-list` returned one channel with exactly `_id`, `name`, `type`, `status`, `min`, `max`, `upi_id`, `effective_min`, `effective_max`; no-token request returned 401. |
| **C3 — Database-paged bid histories** | **PASS — main-market edge cases** | `POST /api/main-market-bet-history` normalized page 0 to page 1, accepted string page `"2"`, returned an empty page for 99 with a clear message, and returned no-match message for market `NOPE`. Main, Starline, and Jackpot default page responses included counts and pagination. |
| **C4 — Market-list result handling/query optimization** | **PARTIAL** | The three market-list endpoints returned rows and the new status fields. No market with multiple same-day result rows was available to verify newest-result selection; query count cannot be confirmed from black-box API responses. |
| **C5 — Console deposit-routing control** | **NOT TESTED** | Requires the deployed admin console and admin test access; neither is part of this player-API test run. |
| **C6 — Payment-provider email** | **NOT TESTED** | Checklist requires a real deposit and payout plus payment-service logs. No financial transaction was initiated. |
| **C7 — Human-readable messages** | **PARTIAL** | Checked 27 read responses: 26 used a non-generic `message`; `/api/support-chat` uses a descriptive `note` as specified. This is a representative check, not all 57 routes. |
| **C8 — Small validation fixes** | **PARTIAL** | Invalid `POST /api/update-notification` type returned the documented refusal. Video/game-rate endpoints had data; empty-data variants, missing FCM token, invalid notification status, invalid IFSC, and missing-file behavior were not tested. |

## Endpoint list exercised

All paths below are under `https://api.rcbmatka.com`.

| Methods | Endpoints |
|---|---|
| `GET` | `/health`, `/api/get-profile-usser`, `/api/app-setting-list`, `/api/main-market-list`, `/api/kingstarline-market-list`, `/api/kingjackport-market-list`, `/api/my-game-rates`, `/api/getway-list`, `/api/deposit-history-pending-count`, `/api/deposit-status`, `/api/withdraw-request-list`, `/api/notifiaction-list`, `/api/user-chat-count`, `/api/support-chat`, `/api/referral-summary`, `/api/main-market-time-table`, `/api/game-rate-list`, `/api/support-contacts`, `/api/support-whatsapp`, `/api/onboarding-whatsapp` |
| `POST` | `/api/user-login`, `/api/update-user-profile` (rejected username only), `/api/user-notice-board`, `/api/number-list`, `/api/main-market-bet-history`, `/api/kingstarline-market-bet-history`, `/api/kingJackport-market-bet-history`, `/api/kingstarline-market-result-history` (removed-route check), `/api/withdraw-manage-permission`, `/api/withdraw-list-bank-account`, `/api/withdraw-list-bank-account-success`, `/api/deposit-history`, `/api/passbook-list`, `/api/update-notification` (unknown type only), `/api/video-list`, `/api/front-user-contact-us`, `/api/active-chat` (removed-route check), `/api/submit-idea` (removed-route check), `/api/register-step1` (removed-route check), `/api/deposit-status` (removed-route check) |

The no-token session matrix covered 13 protected read routes:
`get-profile-usser`, `my-game-rates`, the three bet histories, `getway-list`,
`deposit-history`, both bank-list routes, `withdraw-request-list`,
`passbook-list`, `notifiaction-list`, and `support-chat`.

## Not executed

The checklist includes operations that can move money, change bank details,
alter account state, create/close support conversations, or alter live
configuration. These were intentionally not executed against live:

- Any `POST /api/bet-place` or withdrawal request.
- Bank-account create/change and console approval/decline.
- Support-chat send, image, and close workflows.
- Real payment-in or payout; payment provider request bodies/logs.
- Admin console App Settings and Deposit routing UI.
- Old Passbook repair script or any geo/contact setting changes.
- Mobile UI flows for stake validation, geo restrictions, empty states, and
  pagination.

## Next actions

1. Import the updated 89-request player collection with business assertions and
   rerun it against the intended environment.
2. Retest app/admin/payment items on their deployed builds and dedicated test
   accounts; use a payment sandbox rather than real funds where available.
3. Obtain explicit approval before running historical Passbook repairs.
