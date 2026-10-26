# QA Reference Fixes — Live API Retest

**Date:** 2026-10-26  
**Target:** `https://api.rcbmatka.com`  
**Result:** Core API fixes retested. One response-contract mismatch remains.

The existing `api-execution-report.json` records HTTP outcomes, but most entries
do not assert the fix-specific response behavior. This retest checked those
behaviors directly against the live API. It used the configured test player for
authenticated reads and did not send business-data mutation requests.

## Results

| Bug | Result | Evidence |
|---|---|---|
| BUG-01 — Half / Full Sangam pana lists | **PASS** | All five list types returned their expected list sizes; both Sangam lists included `344`. |
| BUG-02 — Withdrawal limits | **PASS** | Profile and withdrawal-permission responses agreed on the limit source and values. |
| BUG-03 — Deposit maximum | **PASS** | The active deposit channel returned effective limits, including the configured maximum of ₹49,999. |
| BUG-04 — Staff details in withdrawal history | **PASS** | Withdrawal-history rows did not include payout-staff email fields. |
| BUG-05 — Geo handling across app screens | **NOT TESTED** | Requires exercising the updated mobile app; this workspace contains API automation only. |
| BUG-06 — Player-specific stake limits | **NOT TESTED** | Requires the updated mobile app and a player with configured individual rates. |
| BUG-07 — Username-refusal message | **NOT TESTED** | The profile-update request can change account data if validation behaves unexpectedly, so it was not sent. |
| BUG-08 — Empty bank lists | **PARTIAL PASS** | The approved-bank endpoint returned `success: "1"` with an empty array. The regular bank-list endpoint had an existing account, so its no-account case was not available. |
| BUG-09 — Session checks | **PARTIAL PASS** | Ten protected read endpoints returned HTTP 401 without a token: profile, game rates, three bet histories, deposit history, both bank lists, withdrawals, and Passbook. The full set of 19 routes and expired-token behavior were not exhaustively retested. |
| BUG-10 — Support contacts | **PASS / CONFIGURATION** | With no contact number enabled, the API returned the documented no-number response. The owner’s contact-number configuration remains a separate decision. |
| BUG-11 — Notice ordering | **INCONCLUSIVE** | Only one notice was returned, so ordering could not be compared. |
| BUG-12 — Video titles | **PASS** | The returned video included a non-empty `title`. |
| BUG-13 — Unknown number-list type | **PASS** | The API promptly returned `success: "0"` and the documented unknown-type message. |
| BUG-14 — App Setting response allowlist | **PASS** | The full retest spec explicitly allows `_id` plus the 15 app fields. `app-setting-list`, `front-user-contact-us`, and profile `settingData` contained exactly those fields; no other fields were observed. |
| BUG-15 — Win History totals and pages | **PASS** | All three bet-history endpoints returned numeric `total_win_amount`. Main-market pages 1 and 3 each returned 10 rows and consistent total/page metadata. |
| BUG-16 — Passbook pages and totals | **PASS** | Pages 1 and 2 returned 20 rows each and identical whole-ledger counts and totals; the credit filter returned its matching rows. |

## Follow-up

The earlier retest treated `_id` as unexpected; the full retest specification
clarifies that `_id` is allowed, so that finding is closed. Recheck BUG-05 and
BUG-06 on the deployed mobile build.

## Additional endpoints requested

These are the specific endpoints related to the checks that were incomplete or
needed client-side verification. The API responses below were tested where safe;
bid placement and profile updates were not invoked because they can change
account or financial data.

| Bug | Method and endpoint | Retest result |
|---|---|---|
| BUG-05 — location headers and region-block handling | `POST /api/bet-place` and `POST /api/bet-place-sp-dp-tp` | Not invoked; these place bids. Geo headers and 451-screen behavior require the updated app. |
| BUG-05 — location headers on histories | `POST /api/main-market-bet-history`, `POST /api/kingstarline-market-bet-history`, `POST /api/kingJackport-market-bet-history` | Live read endpoints returned HTTP 200 with a valid session. No-token checks returned HTTP 401. App geo-header behavior remains unverified. |
| BUG-05 — location headers on funds and account screens | `POST /api/passbook-list`, `POST /api/deposit-history`, `GET /api/withdraw-request-list`, `POST /api/withdraw-list-bank-account`, `POST /api/withdraw-list-bank-account-success` | Live read endpoints returned HTTP 200 with a valid session. No-token checks returned HTTP 401. App geo-header behavior remains unverified. |
| BUG-05 — location headers on withdrawal submission | `POST /api/withdraw-request-store` | Not invoked because it can create a withdrawal request. Geo-header behavior needs the updated app. |
| BUG-06 — player-specific stake ranges | `GET /api/my-game-rates` | **PASS:** HTTP 200; `success: "1"`; response included per-game `min` and `max` values for the player. |
| BUG-06 — server-side bid enforcement | `POST /api/bet-place` (all bid types), `POST /api/bet-place-sp-dp-tp` | Not invoked because these can place bids. Validate on a controlled test account/app build. |
| BUG-07 — username refusal reason | `POST /api/update-user-profile` | Not invoked; it can change the username if the request is accepted. Validate a rejected username on a disposable test account. |
| BUG-11 — notice ordering | `POST /api/user-notice-board` | **INCONCLUSIVE:** HTTP 200, but only one notice was available to compare. |

The existing automation run is recorded separately in
[`api-execution-report.json`](./api-execution-report.json); the endpoint-level
evidence above distinguishes completed read-only checks from actions requiring
the app or a disposable test account.
