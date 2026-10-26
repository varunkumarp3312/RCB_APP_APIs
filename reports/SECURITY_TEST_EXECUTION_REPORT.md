# Production API Security Test Execution Report

**Date:** 2026-10-26 (IST)  
**Target:** `https://api.rcbmatka.com`  
**Scope:** Non-disruptive, anonymous HTTP/TLS/authentication checks  
**Result:** 9 checks completed; no service errors observed.

## Safety boundaries

- No production login or credential use.
- No state-changing calls, account access with a valid token, payment actions,
  file uploads, exploit payloads, fuzzing, enumeration, brute force, or load
  tests.
- Requests were limited to nine low-rate GET/OPTIONS checks.
- An invalid dummy bearer value was used only to verify that protected read
  endpoints reject invalid authentication.

## Execution summary

| Check | Result | Evidence |
|---|---|---|
| Protected endpoint, no authorization | **PASS** | `GET /api/getway-list`, `/api/user-chat-count`, and `/api/get-profile-usser` each returned HTTP 401 with a JSON refusal. |
| Protected endpoint, invalid bearer | **PASS** | `GET /api/getway-list` and `/api/user-chat-count` each returned HTTP 401; no data was returned. |
| Public settings data minimization | **PASS** | `GET /api/app-setting-list` returned only the documented `_id` and 15 app fields; no sensitive player/staff fields were present. |
| HTTP-to-HTTPS behavior | **PASS** | `GET http://api.rcbmatka.com/health` returned HTTP 301 to the HTTPS URL. |
| CORS preflight | **OBSERVATION** | An unauthenticated `OPTIONS` preflight returned HTTP 200 with wildcard origin, methods, and headers; credentials were not allowed. |
| Security response headers | **HARDENING GAP** | HTTPS responses did not include HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, or `Referrer-Policy`. `X-Powered-By` was absent. |
| Service availability during checks | **PASS** | All nine checks completed without a network error; protected routes returned expected auth refusals. |

## Findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | ⚪ LOW | `https://api.rcbmatka.com` | HTTPS response headers | Strict-Transport-Security was absent. Plain HTTP currently redirects to HTTPS (301), but HSTS would instruct compatible clients to keep using HTTPS and reduce downgrade exposure. | 8/10 |
| 2 | ⚪ LOW | `https://api.rcbmatka.com/api/getway-list` | OPTIONS response headers | CORS preflight allows wildcard origins, methods, and headers. `Access-Control-Allow-Credentials` was absent and protected GETs rejected missing/invalid bearer tokens, so no cross-origin data access was demonstrated. Review whether the wildcard policy is intentional; restrict it if browser access is not meant to be public. | 8/10 |
| 3 | ⚪ LOW | `https://api.rcbmatka.com` | HTTPS response headers | Baseline browser hardening headers CSP, `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` were absent on the sampled API/health responses. These headers are defense-in-depth; applicability depends on whether responses are rendered as active browser content. | 8/10 |

These are low-severity configuration-hardening observations, not confirmed
exploitable vulnerabilities. The checks did not establish that an attacker can
read protected data, execute script, or downgrade a production session.

## Endpoint-level evidence

| Method | Endpoint / target | Test data | HTTP | Result |
|---|---|---|---:|---|
| GET | `/api/getway-list` | No Authorization header | 401 | PASS — JSON authentication refusal |
| GET | `/api/getway-list` | Invalid dummy bearer token | 401 | PASS — JSON invalid-session refusal |
| GET | `/api/user-chat-count` | No Authorization header | 401 | PASS — JSON authentication refusal |
| GET | `/api/user-chat-count` | Invalid dummy bearer token | 401 | PASS — JSON invalid-session refusal |
| GET | `/api/get-profile-usser` | No Authorization header | 401 | PASS — JSON authentication refusal |
| GET | `/api/app-setting-list` | No credentials | 200 | PASS — allowlisted public settings response |
| GET | `/health` | HTTPS | 200 | PASS — service reachable; hardening headers recorded above |
| GET | `http://api.rcbmatka.com/health` | Plain HTTP | 301 | PASS — redirects to HTTPS |
| OPTIONS | `/api/getway-list` | Origin `https://security-check.invalid`; preflight for GET + Authorization | 200 | OBSERVATION — wildcard CORS policy |

## Recommendations

1. Consider enabling HSTS at the edge after confirming all intended subdomains
   are HTTPS-only. Avoid `includeSubDomains` or preload until the domain owner
   has verified every affected host.
2. Review the wildcard CORS policy. If only known app/web origins need browser
   access, return an explicit origin allowlist and narrowly scoped methods and
   headers. Do not enable credentialed CORS with wildcard origins.
3. Add appropriate browser security headers at the edge or application layer
   where relevant. For API JSON, prioritize HSTS and `X-Content-Type-Options`;
   CSP, framing, and referrer controls are most relevant if HTML is served.
4. Repeat broader security testing in staging with written authorization. Keep
   exploit reproduction, input fuzzing, rate-limit testing, and account-role
   tests out of production.

## Limitations

This is not a comprehensive penetration test. It did not test valid-token
authorization scopes, expired signed tokens, blocked accounts, object-level
authorization across accounts, rate limiting, dependency vulnerabilities,
payment callbacks, injection classes, or application/mobile behavior. Those
tests require a dedicated staging environment and scoped authorization.
