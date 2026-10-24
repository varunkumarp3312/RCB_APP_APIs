# RCB Player API Regression Bug Report

Reference: developer-supplied APP-API-REFERENCE (1).md.
Evidence: full Postman collection regression; all response values are redacted in the companion reports.

## Execution summary

- Collection examples: 111
- Expected HTTP/business outcomes passed: 111
- Failed: 0
- Configuration warnings: 3
- Documented refusal responses matched: 18
- App-used routes per reference: 57 unique routes (86 collection examples)

The original full run reported one support-contact assertion failure because the first validator rejected the documented `success=2` response shape. The contract was corrected to accept the documented no-contact outcome, and that read-only endpoint was rerun successfully. The merged final report contains the corrected result.

## Findings

| ID | Severity | Status | Finding |
|---|---|---|---|
| BUG-001 | HIGH | CONFIRMED | Live stake-rate payloads omit keys expected by the app |
| BUG-002 | HIGH | CONFIRMED | Profile response includes the full settings document |
| CFG-001 | LOW | CONFIGURATION | Support contact channels are not configured |
| INFO-001 | INFO | NOT_REPRODUCED | Payout-sender email was not reproduced in the withdrawal response |
| INFO-002 | INFO | NOT_TESTED | Geo-header behavior was not exercised with restriction enabled |
| SCOPE-001 | INFO | SCOPE | Full collection run includes app and legacy/unused examples |

### BUG-001 - Live stake-rate payloads omit keys expected by the app (HIGH; CONFIRMED)

- Request 51 (main market, HTTP 200) is missing: choice_sp_dp_tp, odd_even, two_digit_panel, half_sangam_b, red_bracket, digits_based_jodi.
- Request 52 (Starline, HTTP 200) is missing: panel_group, choice_pana_sp_dp, odd_even, two_digits_panel.
- The supplied reference documents these app-read keys in sections 5.6 and 11.2; it notes that missing keys interrupt later rate loading.
- Recommendation: Read each rate independently and source per-player min/max from my-game-rates, or return all app-required keys with a verified compatibility contract.

### BUG-002 - Profile response includes the full settings document (HIGH; CONFIRMED)

- Request 3 returned settingData[0] with 40 fields; 30 are outside the app-required allowlist in reference sections 4.3, 4.9 and 11.5.
- Sensitive/internal fields present in the live response shape: email_id, mobile, support_whatsapp_cursor, onboarding_whatsapp_cursor. Values are redacted in reports.
- Recommendation: Return an explicit allowlist of settings needed by the player app rather than the complete settings document.

### CFG-001 - Support contact channels are not configured (LOW; CONFIGURATION)

- Request 16 returned HTTP 200, success=2, with empty WhatsApp/call contact lists.
- The developer reference documents success=2 for the no-configured-contact case; this is not an API contract failure.
- Recommendation: Configure at least one current support contact if the product expects the Call Support screen to work.

### INFO-001 - Payout-sender email was not reproduced in the withdrawal response (INFO; NOT_REPRODUCED)

- Request 73 returned 10 withdrawal row(s); none contained payout_sending_by.
- The reference section 11.3 issue remains unverified for other pages or withdrawal records.
- Recommendation: Keep the serializer privacy regression check and verify additional pages/known payout records in a controlled environment.

### INFO-002 - Geo-header behavior was not exercised with restriction enabled (INFO; NOT_TESTED)

- Live setting geo_restriction_enabled=0.
- The reference section 11.1 describes missing geo headers as a latent issue when geo restriction is enabled.
- Recommendation: Test the geo-restricted path in a non-production environment after the client header handling is corrected; do not enable the live gate for this regression run.

### SCOPE-001 - Full collection run includes app and legacy/unused examples (INFO; SCOPE)

- Executed 111 collection examples. The developer reference identifies 57 app-used routes, represented by 86 collection examples.
- Retired and unused examples remain in the all-suite regression run and are asserted against their documented status/body contracts where specified.
- Recommendation: Use --suite app for APK-used route coverage or --suite legacy for compatibility/deprecation checks.

## Reference items not confirmed by this run

- Sangam 344: the collection request used `type=singlePana`; dedicated `halfSangam`/`fullSangam` cases are still needed.
- Geo-header behavior: the run did not enable the geo restriction gate.
- Withdrawal payout-sender disclosure: not present in the page returned during this run; other pages/records remain unverified.
- Other app issues in reference sections 11.6-11.14 require targeted scenarios or source-level client validation and are not asserted by this API collection run.

## Regression artifacts

- `api-execution-report.pdf`: per-request status and response report.
- `APP APIS EXECUTION with all response02.pdf`: full response appendix for every request.
- `api-execution-report.json`: sanitized machine-readable response record.
