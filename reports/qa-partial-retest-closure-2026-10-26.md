# QA Partial Retest and Closure Disposition

**Date:** 2026-10-26  
**Scope:** R2-BUG-15, R2-BUG-08, R2-BUG-11, R2-BUG-09/C2, C1, and the S1/S2 fixes in the developer's partial-results note  
**Developer reference:** `26. QA-RETEST-PARTIAL-RESULTS-AND-WHAT-IS-ON-PURPOSE.md` (sections 2-9)

## Summary

The developer's local HTTP regression evidence reports **64/64 checks passing** for the missing cases across sections 3-7, plus earlier regression suites passing. The note also explains the intentional behaviors in section 8. This automation workspace does not contain the player API source or the local in-memory verification harness, so those local results are recorded as developer-provided evidence, not independently reproduced here.

This retest independently ran the available API automation in no-write mode and made safe, read-only live checks:

- `npm run test:framework`: **9 passed, 0 failed**.
- App-scoped API suite: 86 scenarios; 6 passed, 1 returned 401, and 79 were skipped because the runner had no login token and writes were disabled. The 401 was `GET /api/getway-list`, which requires authentication; it is a test-setup limitation, not evidence of an API defect. The command exited non-zero.
- Live targeted checks: the notice board returned one notice with the documented newest-first message; all 24 removed-route probes returned 404; unauthenticated `GET /api/getway-list` returned 401.
- No new login, account-state change, logout, bid, withdrawal, bank update, deposit, or other business-data mutation was performed.

## Updated status by item

| Item | Updated status | Retest result and remarks | Developer reference |
|---|---|---|---|
| **R2-BUG-15 - Win History paging and Total Won** | **CLOSED - working per developer regression evidence** | Developer note reports page 1-3, past-end, no-filter, Starline, and Jackpot cases passing locally. Live authenticated history checks were not repeated because no existing player token was available; no fresh login was made. The one-page win-filter response described in the original report is expected for a player with fewer than 21 wins. | Sections 3, 8, and 9 |
| **R2-BUG-08 - Empty bank lists and Passbook** | **CLOSED - working per developer regression evidence** | Developer note reports empty, waiting, declined, approved, and replaced bank-account states, plus empty Passbook behavior, passing locally. Live no-bank/no-entry states were not retested because they require a suitable test player and authenticated access. An empty approved list while an account is waiting or declined is intentional. | Sections 4, 8, and 9 |
| **R2-BUG-11 - Notice board ordering** | **CLOSED - intentional behavior; not a defect** | Live returned one notice and `Notice board: 1 notice, newest first.` The developer explains that the console edits a single notice in place, so live cannot establish multi-notice ordering. Four out-of-order notices and the undated case reportedly passed in the local check. Do not add notices directly to production to test ordering. | Sections 5, 8, and 9 |
| **R2-BUG-09 / C2 - Session checks** | **CLOSED - working per developer regression evidence** | Developer note reports all session cases, including expired, ended, blocked, and logout behavior, passing locally. Live unauthenticated `getway-list` returned the expected 401. The complete live token matrix was not repeated: the environment had no existing token, and obtaining a new one could invalidate an active session. Blocked/expired/ended cases require a controlled test account. | Sections 2, 6, 8, and 9 |
| **C1 - Removed routes and malformed JSON** | **CLOSED - live retest PASS** | Re-probed all 24 removed routes against live with harmless empty POST bodies where applicable. **24/24 returned HTTP 404**, as expected. The developer's local evidence additionally covers malformed/oversized bodies and neighboring method/path behavior. | Sections 7-9 |
| **S1 - Account-status checks on referral routes** | **FIXED BY DEVELOPER - closure pending deployment and live retest** | Developer reports the four referral/bonus routes now return 403 for blocked accounts. A blocked-account live test was not run; it requires blocking a controlled account. | Section 2; developer identifies `app/controllers/referral.controller.js` |
| **S2 - Logout with a replaced token** | **FIXED BY DEVELOPER - closure pending deployment and live retest** | Developer reports logout now ends only the session represented by its token. The two-session live scenario was not run because it can sign out a user's active session. | Section 2; developer identifies `app/controllers/user.controller.js` (`logout`) |

## Intentional behavior - record as remarks, not bugs

The following are accepted behaviors documented by the developer. Keep the remarks with the corresponding closed item rather than reopening them as defects:

- Past-end pages return HTTP 200 with `success: "1"`, an empty `data` array, and page-count context; `total_win_amount` remains the whole-filter total.
- Page sizes, page normalization, next-page `pagination`, unpaged Passbook responses, and empty-array filters follow the installed-app compatibility contract.
- Waiting/declined bank accounts do not appear in the approved list; a locked joining bonus is not a Passbook entry until unlocked. Empty lists can correctly return `success: "1"`.
- The console maintains one notice by editing it in place. The “newest first” message is retained even when the current count is one.
- Blocked-account profile, bet-place, game-rate, and logout responses follow the documented client behavior; open routes contain no player's data.
- Removed routes return 404, not 410. A malformed JSON body can return 400 before route lookup. Existing English refusal strings and legacy market fields remain for installed-app compatibility.

Developer rationale and full behavior notes: sections 5-8 of the developer reference above.

## Verification details and limitations

| Check | Result |
|---|---|
| Current local test framework | 9 passed, 0 failed |
| Current app-scoped live automation | 6 passed, 1 auth-dependent 401, 79 skipped; exit code 1. No authenticated session was available to the runner. |
| Live notice-board read | HTTP 200; one notice; expected newest-first message |
| Live removed-route probes | 24/24 HTTP 404 |
| Live unauthenticated `getway-list` | HTTP 401, expected without a session |
| Developer-provided local regression for sections 3-7 | 64/64 reported passing; harness not present in this workspace |
| GitHub issue status updates | No matching GitHub issues were found for these references, so no remote tracker statuses were changed. The CLOSED dispositions above are this QA report's dispositions. |

The S1/S2 fixes should not be treated as fully QA-closed until deployed and verified with controlled accounts. The remaining live-authenticated cases should be rerun with an approved disposable player token and test accounts; do not create a new session or alter live account state solely to complete this report.
