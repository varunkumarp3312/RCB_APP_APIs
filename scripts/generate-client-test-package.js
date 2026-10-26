const fs = require('node:fs');
const path = require('node:path');
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} = require('docx');

const root = path.resolve(__dirname, '..');
const reports = path.join(root, 'reports');
const sessionRetestPath = path.join(
  process.env.USERPROFILE,
  '.copilot',
  'session-state',
  '89f7e034-d02b-4e9b-9488-d401f7e1a16d',
  'files',
  'qa-readonly-retest',
  'api-execution-report.json'
);

const collectionRun = readJson(path.join(reports, 'api-execution-report.json'));
const focusedRun = readJson(path.join(reports, 'updated-api-test-execution-report.json'));
const noWriteRun = readJson(sessionRetestPath);
const frameworkTestNames = [
  'Loads all 111 collection requests in Postman order',
  'Maps response values for later requests without persisting them to disk',
  'Redacts sensitive values in JSON and unstructured response text',
  'Preserves complete non-text responses in base64 form',
  'Detects unsuccessful API business flags without changing HTTP assertions',
  'Matches API and Postman-variable URLs to the app-used route manifest',
  'Asserts documented negative outcomes and classifies missing support setup',
  'Generates a PDF report containing response details',
  'Does not call a photo endpoint when its required file ID is unavailable'
];

const masterRows = [];
function addRow(row) {
  masterRows.push({
    Test_Cycle: '',
    Test_Case_ID: '',
    Source_Evidence: '',
    Category: '',
    Scenario: '',
    Method: '',
    Endpoint: '',
    Expected_Result: '',
    Actual_Result: '',
    Status: '',
    Environment: '',
    Remarks: '',
    ...row
  });
}

collectionRun.forEach((item, index) => {
  addRow({
    Test_Cycle: 'COLLECTION-111-2026-10-26',
    Test_Case_ID: `API-${String(index + 1).padStart(3, '0')}`,
    Source_Evidence: 'reports/api-execution-report.json; ALL_TEST_CASE_EXECUTION_REPORT.md',
    Category: classify(item),
    Scenario: item.name || item.case || `Postman request ${index + 1}`,
    Method: item.method || '',
    Endpoint: item.url || item.endpoint || '',
    Expected_Result: item.expectedBusiness || `HTTP ${item.expectedStatus || 'documented contract'}`,
    Actual_Result: actualResult(item),
    Status: item.outcome || item.result || 'NOT RECORDED',
    Environment: 'Production API; historical execution on 2026-10-26',
    Remarks: item.businessMessage || item.detail || ''
  });
});

for (const item of focusedRun.tests || []) {
  addRow({
    Test_Cycle: 'FOCUSED-57-2026-10-26',
    Test_Case_ID: `FOCUS-${String(item.caseNumber).padStart(3, '0')}`,
    Source_Evidence: 'reports/updated-api-test-execution-report.json; qa-reference-retest-2026-10-26.md',
    Category: classify(item),
    Scenario: item.case,
    Method: item.method,
    Endpoint: item.endpoint,
    Expected_Result: item.detail || 'Documented API response contract',
    Actual_Result: `HTTP ${item.httpStatus}`,
    Status: item.result,
    Environment: 'Production API; focused read-only/refusal checks',
    Remarks: item.testData || ''
  });
}

const securityCases = [
  ['SEC-01', 'Authentication', 'Unauthenticated protected gateway list', 'GET', '/api/getway-list', '401 JSON refusal', '401; no protected data returned', 'PASS'],
  ['SEC-02', 'Authentication', 'Unauthenticated protected chat count', 'GET', '/api/user-chat-count', '401 JSON refusal', '401; no protected data returned', 'PASS'],
  ['SEC-03', 'Authentication', 'Unauthenticated protected profile', 'GET', '/api/get-profile-usser', '401 JSON refusal', '401; no protected data returned', 'PASS'],
  ['SEC-04', 'Authentication', 'Invalid bearer token on gateway list', 'GET', '/api/getway-list', '401 JSON refusal', '401; no protected data returned', 'PASS'],
  ['SEC-05', 'Authentication', 'Invalid bearer token on chat count', 'GET', '/api/user-chat-count', '401 JSON refusal', '401; no protected data returned', 'PASS'],
  ['SEC-06', 'Response validation / data minimization', 'Public settings allowlist', 'GET', '/api/app-setting-list', '_id plus documented 15 app fields', 'Allowlisted settings returned', 'PASS'],
  ['SEC-07', 'Transport security', 'HTTP health endpoint redirects to HTTPS', 'GET', 'http://api.rcbmatka.com/health', '301 redirect to HTTPS', '301 redirect observed', 'PASS'],
  ['SEC-08', 'Availability', 'HTTPS health endpoint reachable', 'GET', '/health', 'HTTP 200; no network error', 'HTTP 200; service available during check', 'PASS'],
  ['SEC-09', 'CORS / security headers', 'OPTIONS preflight and baseline response headers', 'OPTIONS', '/api/getway-list', 'Review CORS and browser hardening headers', 'Wildcard CORS observed; HSTS/CSP/XCTO/XFO/Referrer-Policy absent on sampled responses', 'OBSERVATION - LOW HARDENING FOLLOW-UP']
];
for (const [id, category, scenario, method, endpoint, expected, actual, status] of securityCases) {
  addRow({
    Test_Cycle: 'SECURITY-9-2026-10-26',
    Test_Case_ID: id,
    Source_Evidence: 'reports/SECURITY_TEST_EXECUTION_REPORT.md',
    Category: category,
    Scenario: scenario,
    Method: method,
    Endpoint: endpoint,
    Expected_Result: expected,
    Actual_Result: actual,
    Status: status,
    Environment: 'Production; low-rate, non-disruptive checks',
    Remarks: 'No exploitation, fuzzing, brute force, state changes, or load testing.'
  });
}

frameworkTestNames.forEach((name, index) => {
  addRow({
    Test_Cycle: 'LOCAL-FRAMEWORK-9',
    Test_Case_ID: `FRAMEWORK-${String(index + 1).padStart(2, '0')}`,
    Source_Evidence: 'npm run test:framework; output 2026-10-26',
    Category: 'Automation framework / regression',
    Scenario: name,
    Expected_Result: 'Automated test passes',
    Actual_Result: 'Passed',
    Status: 'PASS',
    Environment: 'Local Node.js test runner',
    Remarks: '9 tests passed; 0 failed.'
  });
});

for (const item of noWriteRun) {
  const blocked = item.status === 'SKIPPED';
  const setupFailure = item.outcome === 'FAIL' && item.status === 401;
  addRow({
    Test_Cycle: 'APP-SUITE-NOWRITE-86-2026-10-26',
    Test_Case_ID: `APP-${String(item.id).padStart(3, '0')}`,
    Source_Evidence: 'session-state/qa-readonly-retest/api-execution-report.json',
    Category: 'API regression / ' + (item.folder || 'App-used routes'),
    Scenario: item.name,
    Method: item.method,
    Endpoint: item.url,
    Expected_Result: `HTTP ${item.expectedStatus} and documented response`,
    Actual_Result: blocked ? item.response : `HTTP ${item.status}`,
    Status: blocked ? 'SKIPPED - NO-WRITE/AUTH PREREQUISITE' : setupFailure ? 'BLOCKED - AUTH SETUP (401)' : item.outcome,
    Environment: 'Production API; allow_writes=false; no player token loaded',
    Remarks: blocked
      ? 'Not sent. No valid token was available or mutation was disallowed.'
      : setupFailure
        ? 'Expected 200 for authenticated request, received 401 because runner had no session token. This is a test setup blocker, not a confirmed application defect.'
        : item.businessMessage || ''
  });
}

const targetedRemovedRoutes = [
  'register-jmeter', 'register-step1', 'register-step2', 'register-step3', 'register-step4',
  'user-signup', 'Verify-mpin', 'recoveryAccount', 'check-user-mobile-registration',
  'change-mpin', 'forget-mpin-otpsend', 'forget-mpin-updatempin',
  'send-otp-for-forgot-password', 'forgot-password-verify-otp', 'forgot-password-reset',
  'deposit-success', 'submit-idea', 'active-chat', 'main-market-result-history',
  'kingstarline-market-result-history', 'kingJackport-market-result-history',
  'bet-place-sp-dp-tp', 'notifiaction-clear', 'deposit-status'
];
for (const [index, endpoint] of targetedRemovedRoutes.entries()) {
  const method = endpoint === 'notifiaction-clear' ? 'GET' : 'POST';
  addRow({
    Test_Cycle: 'LIVE-TARGETED-C1-24-2026-10-26',
    Test_Case_ID: `C1-${String(index + 1).padStart(2, '0')}`,
    Source_Evidence: 'Live targeted safe retest; 2026-10-26',
    Category: 'Routing / removed endpoint',
    Scenario: `Removed route returns the documented not-found response: ${method} ${endpoint}`,
    Method: method,
    Endpoint: `/api/${endpoint}`,
    Expected_Result: 'HTTP 404',
    Actual_Result: 'HTTP 404',
    Status: 'PASS',
    Environment: 'Production API; harmless request body for POST',
    Remarks: 'No business action is routed behind the retired path.'
  });
}

[
  {
    id: 'LIVE-NOTICE-01', category: 'Response validation / accepted behavior',
    scenario: 'Notice board current live count and message',
    method: 'POST', endpoint: '/api/user-notice-board',
    expected: 'HTTP 200; documented newest-first message; current console supports one notice',
    actual: 'HTTP 200; one notice; "Notice board: 1 notice, newest first."',
    status: 'PASS - CURRENT RESPONSE; ORDERING NOT INFERABLE FROM ONE ROW',
    remarks: 'Developer reports four-notice ordering and undated-item behavior passed locally.'
  },
  {
    id: 'LIVE-AUTH-01', category: 'Authentication',
    scenario: 'Unauthenticated getway-list request is rejected',
    method: 'GET', endpoint: '/api/getway-list',
    expected: 'HTTP 401 without Authorization',
    actual: 'HTTP 401; documented not-logged-in response',
    status: 'PASS',
    remarks: 'No test token was available. Authenticated reads were not run.'
  }
].forEach((item) => addRow({
  Test_Cycle: 'LIVE-TARGETED-READONLY-2026-10-26',
  Test_Case_ID: item.id,
  Source_Evidence: 'Live targeted safe retest; 2026-10-26',
  Category: item.category,
  Scenario: item.scenario,
  Method: item.method,
  Endpoint: item.endpoint,
  Expected_Result: item.expected,
  Actual_Result: item.actual,
  Status: item.status,
  Environment: 'Production API; no state-changing operation',
  Remarks: item.remarks
}));

const qaReport = fs.readFileSync(path.join(reports, 'qa-all-resolved-bugs-retest-2026-10-26.md'), 'utf8');
const qaTable = qaReport.split('## Results by reference')[1]?.split('## Endpoint list exercised')[0] || '';
for (const [index, line] of qaTable.split(/\r?\n/).filter((line) => /^\| \*\*/.test(line)).entries()) {
  const cells = markdownCells(line);
  if (cells.length < 3) continue;
  addRow({
    Test_Cycle: 'QA-BUG-REFERENCE-RETEST-2026-10-26',
    Test_Case_ID: `REF-${String(index + 1).padStart(2, '0')}`,
    Source_Evidence: 'reports/qa-all-resolved-bugs-retest-2026-10-26.md',
    Category: 'Bug / reference retest',
    Scenario: cells[0].replace(/\*\*/g, ''),
    Expected_Result: 'Pass on available API checks or documented limitation',
    Actual_Result: cells[2].replace(/\*\*/g, ''),
    Status: normalizeStatus(cells[2]),
    Environment: 'Production player API unless identified otherwise',
    Remarks: cells.slice(3).join(' | ').replace(/\*\*/g, '')
  });
}

const closureReport = fs.readFileSync(path.join(reports, 'qa-partial-retest-closure-2026-10-26.md'), 'utf8');
const closureTable = closureReport.split('## Updated status by item')[1]?.split('## Intentional behavior')[0] || '';
for (const [index, line] of closureTable.split(/\r?\n/).filter((line) => /^\| \*\*/.test(line)).entries()) {
  const cells = markdownCells(line);
  if (cells.length < 4) continue;
  addRow({
    Test_Cycle: 'PARTIAL-RETEST-CLOSURE-2026-10-26',
    Test_Case_ID: `CLOSE-${String(index + 1).padStart(2, '0')}`,
    Source_Evidence: 'reports/qa-partial-retest-closure-2026-10-26.md',
    Category: 'Retest / closure status',
    Scenario: cells[0].replace(/\*\*/g, ''),
    Expected_Result: 'Closure status supported by cited developer or live evidence',
    Actual_Result: cells[2].replace(/\*\*/g, ''),
    Status: normalizeStatus(cells[2]),
    Environment: 'Mixed: live targeted checks and developer-reported local evidence',
    Remarks: cells[3].replace(/\*\*/g, '')
  });
}

const localAggregateEvidence = [
  ['DEV-LOCAL-64', 'Developer partial regression cases, sections 3-7', 64, 64, 'Developer-reported local HTTP checks; harness unavailable in this workspace.'],
  ['DEV-REG-170', 'Prior cleanup regression suite', 170, 170, 'Developer-reported result in partial-results note.'],
  ['DEV-REG-29', 'Prior fix regression suite 2.21', 29, 29, 'Developer-reported result in partial-results note.'],
  ['DEV-REG-47', 'Prior fix regression suite 2.20', 47, 47, 'Developer-reported result in partial-results note.'],
  ['DEV-REG-13', 'Contacts-off regression suite', 13, 13, 'Developer-reported result in partial-results note.'],
  ['DEV-REG-17', '4.4 section 12 regression suite', 17, 17, 'Developer-reported result in partial-results note.']
];
for (const [id, scenario, count, passed, remarks] of localAggregateEvidence) {
  addRow({
    Test_Cycle: 'DEVELOPER-LOCAL-AGGREGATE-EVIDENCE',
    Test_Case_ID: id,
    Source_Evidence: 'Developer reference: 26. QA-RETEST-PARTIAL-RESULTS-AND-WHAT-IS-ON-PURPOSE.md, section 9',
    Category: 'Local regression evidence (aggregate)',
    Scenario: scenario,
    Expected_Result: `${count}/${count} pass`,
    Actual_Result: `${passed}/${count} pass`,
    Status: 'PASS - DEVELOPER REPORTED; NOT INDEPENDENTLY REPRODUCED',
    Environment: 'Developer local environment',
    Remarks: remarks
  });
}

for (const [index, remark] of [
  'Past-end pagination returns HTTP 200 with an empty page; not an error.',
  'The approved-bank list can be empty while a bank account is pending or declined.',
  'One notice is edited in place by the console; live order cannot be inferred from one notice.',
  'Blocked profile, bet-place, game-rates and logout responses follow the documented app contract.',
  'Removed routes return 404 rather than 410; malformed JSON can fail before route lookup.',
  'Legacy message strings and market response fields remain for installed-app compatibility.'
].entries()) {
  addRow({
    Test_Cycle: 'ACCEPTED-BEHAVIOR-NOT-BUG',
    Test_Case_ID: `DESIGN-${String(index + 1).padStart(2, '0')}`,
    Source_Evidence: 'Developer reference section 8; qa-partial-retest-closure-2026-10-26.md',
    Category: 'Accepted behavior / compatibility remark',
    Scenario: remark,
    Expected_Result: 'Behavior matches developer explanation and compatibility contract',
    Actual_Result: 'Documented as intentional; applicability is noted per bug reference',
    Status: 'NOT A BUG - ACCEPTED',
    Environment: 'Contract / product behavior',
    Remarks: 'Retain this rationale when communicating closure; do not reopen as a defect without changed requirements.'
  });
}

const csvPath = path.join(reports, 'master_Testcase_suite.csv');
writeCsv(csvPath, masterRows);

const distinctReferencedTests = {
  collection: collectionRun.length,
  focused: (focusedRun.tests || []).length,
  framework: frameworkTestNames.length,
  security: securityCases.length,
  noWriteScenarios: noWriteRun.length,
  liveRetiredRoutes: targetedRemovedRoutes.length,
  liveTargeted: 2,
  bugReferenceRows: qaTable.split(/\r?\n/).filter((line) => /^\| \*\*/.test(line)).length,
  closureRows: closureTable.split(/\r?\n/).filter((line) => /^\| \*\*/.test(line)).length,
  developerAggregateRows: localAggregateEvidence.length,
  acceptedBehaviorRows: 6
};
const collectionCounts = countOutcomes(collectionRun);
const focusedCounts = countOutcomes(focusedRun.tests || []);
const noWriteCounts = countOutcomes(noWriteRun);

const coverageDoc = createDocument([
  title('MASTER TEST COVERAGE REPORT', 'Client Submission | RCB Player API Automation'),
  paragraph('Reporting date: 26 October 2026 | Target: https://api.rcbmatka.com | Scope: player API automation and recorded related retests'),
  heading('1. Executive summary'),
  paragraph('This report consolidates the test cases and evidence present in the project workspace. It covers functional API behavior, security-boundary checks, API integration/HTTP execution, input and response validation, pagination, authentication, routing, error handling, data minimization, and automation framework checks. The API-only workspace does not contain the mobile application, admin console, payment provider, or player API source.'),
  summaryTable([
    ['Evidence set', 'Coverage / result'],
    ['Postman full regression execution', `${collectionRun.length} requests; ${collectionCounts.pass} passed; ${collectionCounts.fail} failed.`],
    ['Focused production API run', `${focusedCounts.pass} passed; ${focusedCounts.fail} failed; ${focusedCounts.notRun} not run.`],
    ['Security execution', '9 low-rate checks completed; 3 low-severity hardening observations recorded.'],
    ['Local automation framework', '9 passed; 0 failed.'],
    ['Latest app-scoped no-write run', `${noWriteCounts.pass} passed; ${noWriteCounts.fail} auth-setup failure; ${noWriteCounts.skipped} skipped.`],
    ['Additional targeted live retest', '24/24 retired-route probes returned 404; notice response and unauthenticated auth refusal matched expectation.'],
    ['Developer local evidence', '64/64 partial retest checks and 276 additional regression checks reported passing; not independently reproduced here.']
  ]),
  heading('2. Test coverage by category'),
  summaryTable([
    ['Coverage area', 'What was exercised', 'Result / limitation'],
    ['Functional API', 'Login/profile reads, market lists, game rates, bid histories, deposits/withdrawals read endpoints, Passbook, notices, support, referral/info endpoints.', 'Read-only behavior broadly exercised; writes requiring financial or account state were excluded.'],
    ['Integration / HTTP contract', 'Production HTTP status and response shape/content checks; Cucumber/Postman runner execution; local Node test-framework validation.', '111-case and 57-case recorded runs passed. Latest app run blocked by missing token and write guard.'],
    ['Input and data validation', 'Invalid values, missing/forged auth, empty filters, paging boundaries, unknown list type, malformed JSON, response field allowlists and numeric values.', 'Covered by historical/focused runs and developer local regression evidence. Live edge cases limited by account data.'],
    ['Pagination and data consistency', 'Win totals/pages, Passbook pages/counts/totals, market/result ordering and no-match/past-end behavior.', 'Developer local 64-case run fills missing shapes; authenticated live retest remains limited.'],
    ['Security', 'Missing/invalid token rejection, public-setting data minimization, HTTPS redirect, CORS and baseline security headers.', 'No exploit testing. Three low-severity hardening observations remain for owner review.'],
    ['Routing / error handling', 'Removed paths, incorrect method/path handling, malformed/oversized JSON and 404/400/413 behavior.', 'All 24 removed routes were independently re-probed: 24/24 expected 404. Other body/error cases were local developer evidence.'],
    ['Automation quality', 'Request ordering, variable handling, redaction, report generation, business-flag checks and file-availability guards.', 'Local framework tests passed 9/9.'],
    ['Mobile application', 'Stake-entry UX, geo headers/region-block screens, pagination and UI empty states.', 'Not verified; mobile build/device testing not available in this API automation workspace.'],
    ['Admin / payment integration', 'Deposit routing console, approval workflows, payment provider pay-in/payout and related email/log behavior.', 'Not tested; separate deployed systems, sandbox, access and approvals required.']
  ]),
  heading('3. Coverage scope and test safety'),
  bullet('Production checks were low-volume and limited to read operations, expected refusals, authentication rejection, and removed-route probes.'),
  bullet('No production bids, withdrawals, deposits, payout, bank-detail update, support conversation mutation, account block/unblock, or live configuration change was executed in this retest.'),
  bullet('Credentials, tokens, account identifiers, payment details, and personal data are redacted from submitted evidence.'),
  bullet('Historical execution results, current retest results, and developer-reported local results are separate evidence cycles and must not be added together as unique test cases.'),
  heading('4. Evidence files'),
  bullet('master_Testcase_suite.csv — case-level execution and disposition register, with source evidence and cycle labels.'),
  bullet('TEST_EXECUTION_REPORT.docx — execution totals, observed failures/blockers, and security observations.'),
  bullet('TEST_CLOSURE_REPORT.docx — disposition, reported defects, accepted behaviors, and remaining closure conditions.'),
  bullet('Existing reports: ALL_TEST_CASE_EXECUTION_REPORT.md, ALL_TEST_CASE_COVERAGE_BUGS.md, qa-all-resolved-bugs-retest-2026-10-26.md, qa-partial-retest-closure-2026-10-26.md, SECURITY_TEST_EXECUTION_REPORT.md.')
]);

const executionDoc = createDocument([
  title('TEST EXECUTION REPORT', 'Client Submission | RCB Player API Automation'),
  paragraph('Date: 26 October 2026 | Target: https://api.rcbmatka.com | Report status: PARTIAL SIGN-OFF'),
  heading('1. Executive result'),
  paragraph('The recorded historical full collection run and focused production check passed their documented cases. The latest no-write app-scoped run is not a clean full-suite pass: only seven requests were sent, with six passing and one authenticated gateway request receiving 401 because the runner had no player token; 79 further scenarios were skipped by missing authentication or write protections. This is a test-environment prerequisite issue, not evidence that the gateway endpoint is defective.'),
  summaryTable([
    ['Execution cycle', 'Total', 'Passed', 'Failed / blocked', 'Skipped / not run', 'Exit / qualification'],
    ['Full collection historical run', collectionRun.length, collectionCounts.pass, collectionCounts.fail, collectionCounts.skipped, 'Recorded PASS; see source JSON.'],
    ['Focused production API run', (focusedRun.tests || []).length, focusedCounts.pass, focusedCounts.fail, focusedCounts.notRun, '57/57 PASS; low-risk checks.'],
    ['Latest app-scoped no-write run', noWriteRun.length, noWriteCounts.pass, noWriteCounts.fail, noWriteCounts.skipped, 'Exit 1; 401 is auth setup; not full coverage.'],
    ['Local framework tests', 9, 9, 0, 0, 'PASS; node --test.'],
    ['Live C1 removed-route probes', 24, 24, 0, 0, 'PASS; all returned HTTP 404.'],
    ['Developer local regression', '64 + 276', '64 + 276', '0 reported', 0, 'Developer-reported; not independently rerun.']
  ]),
  heading('2. Latest retest observations'),
  bullet('The current notice-board read returned HTTP 200, one notice, and the expected “newest first” message. A single live notice cannot prove multi-record ordering.'),
  bullet('All 24 removed routes returned the expected HTTP 404 in the targeted live check.'),
  bullet('Unauthenticated GET /api/getway-list returned HTTP 401 as expected. The app-suite runner also received 401 on its authenticated gateway case because no token was loaded.'),
  bullet('The suite was run with writes disabled. No fresh login was created because that could replace an existing single-player session.'),
  heading('3. Bug and security findings'),
  paragraph('Defect accounting: 4 functional/API defect records are present in the combined QA evidence (2 previously confirmed findings, BUG-001 and BUG-002, plus 2 session defects S1 and S2 found during the developer retest). Five partial-result references now have QA dispositions recorded as closed (R2-BUG-15, R2-BUG-08, R2-BUG-11, R2-BUG-09/C2, and C1); these are reference-level closures, not five additional confirmed defects. Of the four defect records, the settings allowlist has later PASS retest evidence, the stake-rate/mobile behavior remains partial, and S1/S2 await deployment and controlled live retesting.'),
  summaryTable([
    ['Finding group', 'Count', 'Status from available evidence'],
    ['Confirmed functional API defects in bug-report.md (BUG-001 and BUG-002)', '2', 'Reported in project QA artifacts. Settings allowlist behavior has later PASS evidence; stake-rate/API plus mobile player-specific behavior is not fully closed.'],
    ['Additional session defects S1/S2', '2', 'Developer reports fixes in the referral controller and logout flow. Deployment and controlled live retest remain pending.'],
    ['Low-severity security hardening observations', '3', 'HSTS, wildcard CORS review, and browser security-header recommendations. Not confirmed exploitable vulnerabilities; owner remediation/acceptance is not recorded.'],
    ['Business-rule refusals', '18 documented refusal responses in bug-report.md', 'Expected API outcomes, not counted as defects.']
  ]),
  paragraph('Issue tracker limitation: no matching GitHub issues were found for the tested references. Therefore this report does not claim remote issue closure or a verified developer notification timestamp. The source reports document the findings, developer fixes/explanations, and retest evidence available.'),
  heading('4. Security execution summary'),
  bullet('Nine low-rate checks covered unauthenticated and invalid bearer-token rejection, public settings allowlisting, HTTPS redirect/health, and CORS/security-header observations.'),
  bullet('No exploitation, fuzzing, brute-force, cross-account authorization test, rate-limit test, payment-callback test, or load test was performed.'),
  bullet('Security findings are hardening observations only. Review and acceptance should be completed by the API/edge owner.'),
  heading('5. Execution limitations'),
  bullet('No player token was available in the current test environment; therefore authenticated reads in the latest app run were not comprehensively executed.'),
  bullet('The workspace does not contain the API service source or the developer in-memory test harness; local retest totals are attributed to the developer reference.'),
  bullet('Mobile, admin-console, and payment-provider flows require their respective deployed build, credentials, sandbox and authorized test data.'),
  bullet('Production data-changing flows were deliberately excluded for safety.'),
  heading('6. Source evidence'),
  bullet('reports/api-execution-report.json — 111-request historical full collection execution.'),
  bullet('reports/updated-api-test-execution-report.json — focused 57-check production run.'),
  bullet('session-state/qa-readonly-retest/api-execution-report.json — latest 86-scenario no-write execution detail.'),
  bullet('reports/SECURITY_TEST_EXECUTION_REPORT.md — security check results and observations.'),
  bullet('reports/qa-partial-retest-closure-2026-10-26.md — updated disposition and developer references.')
]);

const closureDoc = createDocument([
  title('TEST CLOSURE REPORT', 'Client Submission | RCB Player API Automation'),
  paragraph('Date: 26 October 2026 | Project: RCB Player API | Final QA disposition: CONDITIONAL / NEEDS SIGN-OFF'),
  heading('1. Closure decision'),
  paragraph('The documented API automation and selected safe live retests show substantial passing coverage. Four functional/API defect records were identified in the source QA evidence: two originally confirmed findings (BUG-001 and BUG-002) and two additional session defects (S1 and S2). Five partial-result references have recorded QA dispositions, but these are not five additional defects. Full project closure is not recommended yet because the latest app-scoped run was incomplete, S1/S2 still need deployed live verification, and mobile/admin/payment scenarios remain outside the verified scope.'),
  summaryTable([
    ['Disposition', 'Count / scope', 'Basis'],
    ['Full collection historical run', '111/111 passed', 'Recorded execution report; historical 2026-10-26.'],
    ['Focused production checks', '57/57 passed', 'Sanitized execution JSON.'],
    ['Latest no-write app run', '6 passed; 1 auth setup block; 79 skipped', 'Not a full-suite pass; valid token absent and writes disabled.'],
    ['Closed retest references in latest partial report', '5 references', 'R2-BUG-15, R2-BUG-08, R2-BUG-11, R2-BUG-09/C2, C1; C1 was fully re-probed live (24/24), notice-board live shape was checked, and missing cases rely on developer local evidence.'],
    ['Pending deployment/live retest', 'S1, S2', 'Developer-reported fixes; live blocked-account/two-session scenario not performed.'],
    ['Security hardening observations', '3 low', 'Owner decision/remediation not documented; not confirmed exploitable vulnerabilities.']
  ]),
  heading('2. Defect and retest register'),
  summaryTable([
    ['ID / reference', 'Finding / disposition', 'Closure state'],
    ['BUG-001', 'Stake-rate payload missing app-expected rate keys; originally confirmed in bug-report.md. Standard API rates were read, but individualized player rates and updated mobile behavior were unavailable.', 'PARTIAL - NOT FULLY CLOSED'],
    ['BUG-002', 'Profile settings response included fields outside original allowlist; originally confirmed. Later response allowlist checks reported PASS.', 'RETEST PASS IN API EVIDENCE; TRACKER CLOSURE NOT VERIFIED'],
    ['R2-BUG-15', 'Win-history paging/total: developer local coverage reports pages, past-end, totals, Starline and Jackpot pass; production authenticated rerun unavailable.', 'CLOSED BY QA DISPOSITION - DEVELOPER EVIDENCE'],
    ['R2-BUG-08', 'Empty bank/Passbook states: developer local matrix reports empty/waiting/declined/approved/replaced states pass.', 'CLOSED BY QA DISPOSITION - DEVELOPER EVIDENCE'],
    ['R2-BUG-11', 'Notice list order: one notice is maintained by the console; multi-notice ordering reportedly passed locally; one-notice live state cannot prove ordering.', 'CLOSED AS BY DESIGN; LIVE STATE PASS'],
    ['R2-BUG-09 / C2', 'Session behavior: developer local checks cover expired/ended/blocked/logout; live no-token behavior returned expected 401; complete live matrix not run.', 'CLOSED BY QA DISPOSITION - DEVELOPER EVIDENCE'],
    ['C1', '24 removed routes: independently retested live, all returned HTTP 404.', 'CLOSED - LIVE PASS 24/24'],
    ['S1', 'Blocked-account status checks added to four referral/bonus routes.', 'FIXED PER DEVELOPER; DEPLOYMENT/LIVE RETEST PENDING'],
    ['S2', 'Logout should only end the session represented by the request token.', 'FIXED PER DEVELOPER; DEPLOYMENT/LIVE RETEST PENDING'],
    ['SEC-LOW-01..03', 'Absent HSTS, wildcard CORS, missing baseline browser hardening headers on sampled responses.', 'OWNER REVIEW / ACCEPTANCE PENDING']
  ]),
  paragraph('Developer communication/issue-tracker caveat: the source QA reports record the findings, developer explanations, and developer-reported fixes. No matching GitHub issues were found, so an external “developer notified/issue closed” status cannot be independently confirmed from this workspace.'),
  heading('3. Accepted behaviors recorded as non-defects'),
  bullet('Past-end pages return 200 with an empty list; whole-filter win totals remain stable across pages.'),
  bullet('Approved bank lists can be empty when an account is pending or declined; locked bonuses do not appear in the Passbook before unlock.'),
  bullet('The console edits a single notice in place; live ordering is not inferable from one record.'),
  bullet('Blocked-account profile/bet/game-rate/logout responses, removed-route 404 (not 410), malformed-body ordering, legacy message strings and app-compatibility fields follow documented behavior.'),
  bullet('The exact remarks and source sections are recorded in qa-partial-retest-closure-2026-10-26.md and the developer partial-results note.'),
  heading('4. Remaining work before final acceptance'),
  numbered('Deploy the S1/S2 fixes to the target environment, then validate blocked-account referral routes and the replaced-token logout scenario using approved disposable test accounts.'),
  numbered('Provide an approved test player token and controlled account data; rerun authenticated reads, expired/ended/blocked token matrix, win-history pagination, and empty-bank/Passbook cases without disrupting real users.'),
  numbered('Run mobile acceptance tests on the updated APK for geo headers/region restrictions, player-specific stake ranges, stake-entry validation, empty states and UI pagination.'),
  numbered('Run admin-console approval/replacement and deposit-routing checks with a test admin and controlled test player.'),
  numbered('Run payment-provider pay-in/payout checks only in an approved sandbox; verify provider email/log behavior without real funds.'),
  numbered('Resolve or formally accept the three low-severity security hardening observations; verify the selected CORS policy and edge headers in the intended deployment.'),
  numbered('Re-run the complete app-scoped suite with valid credentials/test token and explicit mutation authorization only for approved non-production test data; obtain exit code 0.'),
  heading('5. Overall client-facing status'),
  paragraph('The API regression evidence is positive, and the five targeted partial-result references have QA dispositions. However, this is a conditional closure report, not a claim that every mobile, admin, payment, deployment, and security-hardening action is complete. Final sign-off should be granted after the outstanding items above are completed or formally accepted by the client and system owner.'),
  paragraph('Prepared from the existing automation and QA evidence in the workspace. No remote issue tracker closure was performed; no matching GitHub issues were found.')
]);

async function main() {
  const docPaths = [
    [path.join(reports, 'TEST_COVERAGE.docx'), coverageDoc],
    [path.join(reports, 'TEST_EXECUTION_REPORT.docx'), executionDoc],
    [path.join(reports, 'TEST_CLOSURE_REPORT.docx'), closureDoc]
  ];
  for (const [filePath, document] of docPaths) {
    const buffer = await Packer.toBuffer(document);
    fs.writeFileSync(filePath, buffer);
  }
  console.log(JSON.stringify({
    csv: csvPath,
    csvRows: masterRows.length,
    documents: docPaths.map(([filePath]) => filePath),
    evidenceCounts: { distinctReferencedTests, collectionCounts, focusedCounts, noWriteCounts }
  }, null, 2));
}

function createDocument(children) {
  return new Document({
    creator: 'RCB Player API QA',
    title: 'RCB Player API QA Client Report',
    description: 'Consolidated test coverage, execution, and closure evidence.',
    sections: [{
      properties: {
        page: {
          margin: { top: 900, right: 850, bottom: 900, left: 850 }
        }
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun('RCB Player API QA | Page '), PageNumber.CURRENT]
          })]
        })
      },
      children
    }]
  });
}

function title(text, subtitle) {
  return [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text, bold: true, color: '17365D' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [new TextRun({ text: subtitle, italics: true, color: '555555' })]
    })
  ];
}

function heading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 220, after: 100 },
    children: [new TextRun({ text, bold: true, color: '17365D' })]
  });
}

function paragraph(text) {
  return new Paragraph({ spacing: { after: 110 }, children: [new TextRun(text)] });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 75 },
    children: [new TextRun(text)]
  });
}

function numbered(text) {
  return new Paragraph({
    indent: { left: 220 },
    spacing: { after: 75 },
    children: [new TextRun({ text: `Action: ${text}` })]
  });
}

function summaryTable(rows) {
  const widths = rows[0].length === 6
    ? [2000, 900, 900, 1400, 1600, 3200]
    : rows[0].length === 5
      ? [2400, 1100, 1100, 1500, 3900]
      : rows[0].length === 4
        ? [2200, 2600, 4300, 900]
        : rows[0].length === 3
          ? [2500, 3300, 4200]
          : [2600, 8200];
  const tableRows = rows.map((row, rowIndex) => new TableRow({
    tableHeader: rowIndex === 0,
    children: row.map((cell, index) => new TableCell({
      width: { size: widths[index] || 2000, type: WidthType.DXA },
      shading: rowIndex === 0 ? { type: ShadingType.CLEAR, fill: 'D9EAF7' } : undefined,
      margins: { top: 80, bottom: 80, left: 90, right: 90 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'B7C9D6' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'B7C9D6' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'B7C9D6' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'B7C9D6' }
      },
      children: [new Paragraph({
        spacing: { before: 10, after: 10 },
        children: [new TextRun({
          text: String(cell),
          bold: rowIndex === 0,
          size: 18
        })]
      })]
    }))
  }));
  return new Table({
    width: { size: 10800, type: WidthType.DXA },
    columnWidths: widths,
    rows: tableRows
  });
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required evidence file is missing: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function classify(item) {
  const text = `${item.name || item.case || ''} ${item.endpoint || item.url || ''}`.toLowerCase();
  if (/login|session|token|logout|auth/.test(text)) return 'Authentication / session';
  if (/passbook|deposit|withdraw|bank|payment|gateway/.test(text)) return 'Funds / banking';
  if (/market|bid|win|jackpot|starline|game-rate|rate/.test(text)) return 'Markets / bidding / pagination';
  if (/notice|video|contact|support|referral|bonus/.test(text)) return 'Information / support / referral';
  if (/removed|unknown|invalid|malformed|json|validation/.test(text)) return 'Routing / negative validation';
  if (/setting|profile/.test(text)) return 'Profile / settings / response validation';
  return 'API functional / response validation';
}

function actualResult(item) {
  if (item.httpStatus !== undefined) return `HTTP ${item.httpStatus}`;
  if (item.status !== undefined && item.expectedStatus !== undefined) {
    return `HTTP ${item.status}; expected HTTP ${item.expectedStatus}`;
  }
  return item.actualBusinessSuccess ? `success=${item.actualBusinessSuccess}` : item.status || '';
}

function countOutcomes(items) {
  const counts = { total: items.length, pass: 0, fail: 0, skipped: 0, notRun: 0 };
  for (const item of items) {
    const outcome = String(item.outcome || item.result || '').toUpperCase();
    if (outcome === 'PASS') counts.pass += 1;
    else if (outcome === 'FAIL' || outcome === 'ERROR') counts.fail += 1;
    else if (outcome === 'SKIPPED' || item.status === 'SKIPPED') counts.skipped += 1;
    else if (outcome === 'NOT RUN' || outcome === 'NOTRUN') counts.notRun += 1;
  }
  return counts;
}

function markdownCells(line) {
  return line.split('|').slice(1, -1).map((cell) => cell.trim());
}

function normalizeStatus(text) {
  const value = text.replace(/\*/g, '').toUpperCase();
  if (value.includes('NOT TESTED')) return 'NOT TESTED';
  if (value.includes('PARTIAL')) return 'PARTIAL';
  if (value.includes('INCONCLUSIVE')) return 'INCONCLUSIVE';
  if (value.includes('FAIL')) return 'FAIL';
  if (value.includes('PASS')) return 'PASS';
  if (value.includes('NOT REPRODUCED')) return 'NOT REPRODUCED';
  return 'REVIEW SOURCE REMARKS';
}

function writeCsv(filePath, rows) {
  const headers = Object.keys(rows[0]);
  const content = [
    headers.map(csvField).join(','),
    ...rows.map((row) => headers.map((header) => csvField(row[header] ?? '')).join(','))
  ].join('\r\n');
  fs.writeFileSync(filePath, `\uFEFF${content}\r\n`, 'utf8');
}

function csvField(value) {
  const text = String(value).replace(/\r?\n/g, ' ');
  return `"${text.replace(/"/g, '""')}"`;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
