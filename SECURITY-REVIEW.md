# Production API Security Review

**Date:** 2026-10-26
**Target:** `https://api.rcbmatka.com`
**Review type:** Limited, non-disruptive production checks

## Scope and result

Nine low-rate anonymous GET/OPTIONS checks were run. No production login,
state-changing requests, exploit payloads, fuzzing, brute force, or load tests
were used. Protected read endpoints returned HTTP 401 when authorization was
missing or invalid. The public settings endpoint returned its documented
allowlisted fields, and HTTP health traffic redirected to HTTPS.

No exploitable vulnerability was demonstrated. The observations below are
low-severity configuration-hardening gaps and should be reviewed by the team
that owns the production API gateway or deployment configuration.

## Findings

| # | Severity | Observation | Evidence | Recommendation |
|---|----------|-------------|----------|----------------|
| 1 | LOW | HSTS was absent from sampled HTTPS responses. | HTTP health redirected to HTTPS (301); `Strict-Transport-Security` was not present. | Enable HSTS after verifying all intended subdomains are HTTPS-only. Avoid `includeSubDomains` or preload until domain ownership confirms readiness. |
| 2 | LOW | CORS preflight allowed wildcard origins, methods, and headers. | `OPTIONS /api/getway-list` returned wildcard CORS headers; `Access-Control-Allow-Credentials` was absent. Protected GETs rejected missing and invalid bearer tokens. | Confirm the wildcard policy is intentional. If browser access should be limited, configure an explicit origin allowlist and restrict methods and headers. |
| 3 | LOW | Several browser hardening headers were absent from sampled responses. | No CSP, `X-Content-Type-Options`, `X-Frame-Options`, or `Referrer-Policy` on sampled API/health responses. | Add applicable headers at the edge or application layer. Prioritize `X-Content-Type-Options` for JSON; CSP and framing protections are most relevant when serving active browser content. |

## Limitations

This was not a comprehensive penetration test. Valid-token authorization scopes,
cross-account access, rate limiting, dependency vulnerabilities, payment
callbacks, injection classes, and mobile behavior were not tested. Those checks
require a scoped staging environment and authorization.

## Remediation status

No production configuration or API implementation was changed. This workspace
contains the API automation harness and reports, but not the API server or its
gateway/deployment configuration. Apply the recommendations in the owning
service/deployment repository, then verify them in staging before production.

Detailed endpoint evidence and execution limits are recorded in
[`reports/SECURITY_TEST_EXECUTION_REPORT.md`](reports/SECURITY_TEST_EXECUTION_REPORT.md).
