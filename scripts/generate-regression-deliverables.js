const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const { APP_USED_ROUTES, routeKey } = require('./api-contracts');
const { redactText } = require('./api-runtime');
const { generateReport } = require('./generate-report');

const workspace = path.resolve('.');
const reportDir = path.join(workspace, 'reports');
const resultsPath = path.join(reportDir, 'api-execution-report.json');
const collectionPath = path.resolve(process.env.API_COLLECTION_FILE || 'player-app-api.postman_collection.json');
const referencePath = path.resolve(process.env.API_REFERENCE_FILE || 'c:\\Users\\pmuae\\Downloads\\4. APP-API-REFERENCE (1).md');
const fullResponsePdf = path.join(reportDir, 'APP APIS EXECUTION with all response02.pdf');
const bugMarkdownPath = path.join(reportDir, 'bug-report.md');
const bugPdfPath = path.join(reportDir, 'bug-report.pdf');

async function main() {
  if (!fs.existsSync(resultsPath)) {
    throw new Error(`API results not found: ${resultsPath}`);
  }
  if (!fs.existsSync(collectionPath)) {
    throw new Error(`Postman collection not found: ${collectionPath}`);
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
  const requests = [];
  collectRequests(collection.item || [], requests);
  for (const result of results) {
    if (typeof result.response === 'string' && !result.response.startsWith('[Non-text response:')) {
      result.response = redactText(result.response);
    }
  }
  fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  const appExamples = requests.filter((request) => APP_USED_ROUTES.has(routeKey(request.method, request.url)));
  const appRouteCount = new Set(appExamples.map((request) => routeKey(request.method, request.url))).size;
  const byId = new Map(results.map((result) => [result.id, result]));
  const findings = buildFindings(byId, appExamples.length, appRouteCount, requests.length, requests);

  const executionSummary = await generateReport(
    resultsPath,
    path.join(reportDir, 'api-execution-report.pdf'),
    `${collection.info?.name || 'Player API'} - Full regression`
  );
  await generateReport(
    resultsPath,
    fullResponsePdf,
    `APP APIS EXECUTION - all ${results.length} responses`
  );
  const markdown = buildMarkdown({
    results,
    executionSummary,
    findings,
    appExamples: appExamples.length,
    appRouteCount,
    collectionRequestCount: requests.length,
    referenceExists: fs.existsSync(referencePath)
  });
  fs.writeFileSync(bugMarkdownPath, markdown, 'utf8');
  await generateBugPdf(bugPdfPath, {
    results,
    executionSummary,
    findings,
    appExamples: appExamples.length,
    appRouteCount,
    collectionRequestCount: requests.length,
    referenceExists: fs.existsSync(referencePath)
  });

  console.log(JSON.stringify({
    executionSummary,
    appUsedRouteCount: appRouteCount,
    appRequestExamples: appExamples.length,
    collectionRequestCount: requests.length,
    findings: findings.length,
    reports: [bugMarkdownPath, bugPdfPath, fullResponsePdf, path.join(reportDir, 'api-execution-report.pdf')]
  }, null, 2));
}

function collectRequests(items, requests) {
  for (const item of items) {
    if (item.item) {
      collectRequests(item.item, requests);
    } else if (item.request) {
      requests.push({
        id: requests.length + 1,
        name: item.name || `Request ${requests.length + 1}`,
        method: item.request.method || 'GET',
        url: typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || ''
      });
    }
  }
}

function responseJson(result) {
  try {
    return JSON.parse(result?.response || '');
  } catch {
    return null;
  }
}

function buildFindings(byId, appExamples, appRoutes, collectionRequests, requests) {
  const findings = [];
  const mainRates = responseJson(byId.get(51));
  const starlineRates = responseJson(byId.get(52));
  const profile = responseJson(byId.get(3));
  const mainExpected = [
    'single_digit', 'single_digit_bulk', 'single_pana', 'single_pana_bulk',
    'double_pana', 'double_pana_bulk', 'triple_pana', 'group_pana',
    'sp_dp_tp', 'choice_sp_dp_tp', 'sp_motor', 'dp_motor', 'odd_even',
    'two_digit_panel', 'jodi_digit', 'jodi_digit_bulk', 'half_sangam_a',
    'half_sangam_b', 'full_sangam', 'red_bracket', 'group_jodi',
    'digits_based_jodi'
  ];
  const starlineExpected = [
    'single_digit', 'single_digit_bulk', 'single_pana', 'single_pana_bulk',
    'double_pana', 'double_pana_bulk', 'triple_pana', 'panel_group',
    'sp_dp_tp', 'choice_pana_sp_dp', 'sp_motor', 'dp_motor', 'odd_even',
    'two_digits_panel'
  ];
  const mainActual = mainRates?.data && !Array.isArray(mainRates.data) ? Object.keys(mainRates.data) : [];
  const starlineActual = starlineRates?.data && !Array.isArray(starlineRates.data) ? Object.keys(starlineRates.data) : [];
  const mainMissing = mainExpected.filter((key) => !mainActual.includes(key));
  const starlineMissing = starlineExpected.filter((key) => !starlineActual.includes(key));
  if (mainMissing.length || starlineMissing.length) {
    findings.push({
      id: 'BUG-001',
      severity: 'HIGH',
      title: 'Live stake-rate payloads omit keys expected by the app',
      status: 'CONFIRMED',
      evidence: [
        `Request 51 (main market, HTTP ${byId.get(51)?.status ?? 'not run'}) is missing: ${mainMissing.join(', ') || 'none'}.`,
        `Request 52 (Starline, HTTP ${byId.get(52)?.status ?? 'not run'}) is missing: ${starlineMissing.join(', ') || 'none'}.`,
        `The supplied reference documents these app-read keys in sections 5.6 and 11.2; it notes that missing keys interrupt later rate loading.`
      ],
      recommendation: 'Read each rate independently and source per-player min/max from my-game-rates, or return all app-required keys with a verified compatibility contract.'
    });
  }

  const setting = profile?.settingData?.[0];
  if (setting && typeof setting === 'object') {
    const allowedSettings = new Set([
      'whatsapp_Number', 'whatsapp_Number_first', 'home_screen_marquee',
      'apk_version', 'withdraw_upi', 'min_deposit', 'max_deposit',
      'min_withdraw', 'max_withdraw', 'bonus_unlock_min_deposit'
    ]);
    const extraSettingKeys = Object.keys(setting).filter((key) => !allowedSettings.has(key));
    const referencedSensitiveKeys = ['email_id', 'mobile', 'support_whatsapp_cursor', 'onboarding_whatsapp_cursor']
      .filter((key) => Object.hasOwn(setting, key));
    if (extraSettingKeys.length > 0) {
      findings.push({
        id: 'BUG-002',
        severity: 'HIGH',
        title: 'Profile response includes the full settings document',
        status: 'CONFIRMED',
        evidence: [
          `Request 3 returned settingData[0] with ${Object.keys(setting).length} fields; ${extraSettingKeys.length} are outside the app-required allowlist in reference sections 4.3, 4.9 and 11.5.`,
          `Sensitive/internal fields present in the live response shape: ${referencedSensitiveKeys.join(', ') || 'none of the checked fields'}. Values are redacted in reports.`
        ],
        recommendation: 'Return an explicit allowlist of settings needed by the player app rather than the complete settings document.'
      });
    }
  }

  const contactResult = byId.get(16);
  const contactBody = responseJson(contactResult);
  if (contactBody?.success === '2') {
    findings.push({
      id: 'CFG-001',
      severity: 'LOW',
      title: 'Support contact channels are not configured',
      status: 'CONFIGURATION',
      evidence: [
        `Request 16 returned HTTP ${contactResult.status}, success=2, with empty WhatsApp/call contact lists.`,
        'The developer reference documents success=2 for the no-configured-contact case; this is not an API contract failure.'
      ],
      recommendation: 'Configure at least one current support contact if the product expects the Call Support screen to work.'
    });
  }

  const withdrawals = responseJson(byId.get(73));
  const withdrawalRows = Array.isArray(withdrawals?.data) ? withdrawals.data : [];
  const payoutEmailPresent = withdrawalRows.some((row) => Object.hasOwn(row, 'payout_sending_by'));
  if (payoutEmailPresent) {
    findings.push({
      id: 'BUG-003',
      severity: 'HIGH',
      title: 'Withdrawal history exposes payout sender metadata',
      status: 'CONFIRMED',
      evidence: [
        `Request 73 returned payout_sending_by in ${withdrawalRows.filter((row) => Object.hasOwn(row, 'payout_sending_by')).length} withdrawal row(s).`,
        'The reference section 7.5 identifies this field as staff email and section 11.3 flags the exposure.'
      ],
      recommendation: 'Restrict the player API serializer to fields consumed by the app and exclude payout-sender metadata.'
    });
  } else if (byId.has(73)) {
    findings.push({
      id: 'INFO-001',
      severity: 'INFO',
      title: 'Payout-sender email was not reproduced in the withdrawal response',
      status: 'NOT_REPRODUCED',
      evidence: [
        `Request 73 returned ${withdrawalRows.length} withdrawal row(s); none contained payout_sending_by.`,
        'The reference section 11.3 issue remains unverified for other pages or withdrawal records.'
      ],
      recommendation: 'Keep the serializer privacy regression check and verify additional pages/known payout records in a controlled environment.'
    });
  }

  const settingsRestriction = setting?.geo_restriction_enabled;
  if (setting && String(settingsRestriction) !== '1') {
    findings.push({
      id: 'INFO-002',
      severity: 'INFO',
      title: 'Geo-header behavior was not exercised with restriction enabled',
      status: 'NOT_TESTED',
      evidence: [
        `Live setting geo_restriction_enabled=${String(settingsRestriction)}.`,
        `The reference section 11.1 describes missing geo headers as a latent issue when geo restriction is enabled.`
      ],
      recommendation: 'Test the geo-restricted path in a non-production environment after the client header handling is corrected; do not enable the live gate for this regression run.'
    });
  }

  const numberList = responseJson(byId.get(54));
  const numberListRequest = requestBodyField(requests.find((request) => request.id === 54), 'type') || '(not set)';
  if (numberListRequest === 'singlePana') {
    findings.push({
      id: 'INFO-003',
      severity: 'INFO',
      title: 'Sangam pana 344 was not covered by this collection request',
      status: 'NOT_TESTED',
      evidence: [
        `Request 54 used type=${numberListRequest}; it did not request halfSangam or fullSangam.`,
        `The captured single-pana list ${Array.isArray(numberList?.data) && numberList.data.includes('344') ? 'contains' : 'does not contain'} 344; this does not establish the Sangam behavior described in reference section 11.4.`
      ],
      recommendation: 'Add dedicated halfSangam and fullSangam list scenarios and assert 344 is present.'
    });
  }

  findings.push({
    id: 'SCOPE-001',
    severity: 'INFO',
    title: 'Full collection run includes app and legacy/unused examples',
    status: 'SCOPE',
    evidence: [
      `Executed ${collectionRequests} collection examples. The developer reference identifies ${appRoutes} app-used routes, represented by ${appExamples} collection examples.`,
      'Retired and unused examples remain in the all-suite regression run and are asserted against their documented status/body contracts where specified.'
    ],
    recommendation: 'Use --suite app for APK-used route coverage or --suite legacy for compatibility/deprecation checks.'
  });

  return findings;
}

function requestBodyField(request, key) {
  if (!request?.body || request.body.mode !== 'raw') {
    return '';
  }
  try {
    return JSON.parse(request.body.raw || '')[key] || '';
  } catch {
    return '';
  }
}

function buildMarkdown(data) {
  const passed = data.results.filter((result) => result.outcome === 'PASS').length;
  const failed = data.results.filter((result) => result.outcome === 'FAIL').length;
  const warnings = data.results.filter((result) => result.businessOutcome === 'CONFIGURATION').length;
  const refusals = data.results.filter((result) => result.expectedBusiness?.expectedSuccess !== undefined
    && result.expectedBusiness.expectedSuccess !== '1'
    && result.businessOutcome === 'PASS').length;
  const findingRows = data.findings.map((finding) => (
    `| ${finding.id} | ${finding.severity} | ${finding.status} | ${escapeMarkdown(finding.title)} |`
  ));
  const detail = data.findings.map((finding) => [
    `### ${finding.id} - ${finding.title} (${finding.severity}; ${finding.status})`,
    '',
    ...finding.evidence.map((line) => `- ${line}`),
    `- Recommendation: ${finding.recommendation}`,
    ''
  ].join('\n')).join('\n');

  return [
    '# RCB Player API Regression Bug Report',
    '',
    `Reference: ${data.referenceExists ? 'developer-supplied APP-API-REFERENCE (1).md' : 'developer API reference (path not found)'}.`,
    'Evidence: full Postman collection regression; all response values are redacted in the companion reports.',
    '',
    '## Execution summary',
    '',
    `- Collection examples: ${data.results.length}`,
    `- Expected HTTP/business outcomes passed: ${passed}`,
    `- Failed: ${failed}`,
    `- Configuration warnings: ${warnings}`,
    `- Documented refusal responses matched: ${refusals}`,
    `- App-used routes per reference: ${data.appRouteCount} unique routes (${data.appExamples} collection examples)`,
    '',
    'The original full run reported one support-contact assertion failure because the first validator rejected the documented `success=2` response shape. The contract was corrected to accept the documented no-contact outcome, and that read-only endpoint was rerun successfully. The merged final report contains the corrected result.',
    '',
    '## Findings',
    '',
    '| ID | Severity | Status | Finding |',
    '|---|---|---|---|',
    ...findingRows,
    '',
    detail,
    '## Reference items not confirmed by this run',
    '',
    '- Sangam 344: the collection request used `type=singlePana`; dedicated `halfSangam`/`fullSangam` cases are still needed.',
    '- Geo-header behavior: the run did not enable the geo restriction gate.',
    '- Withdrawal payout-sender disclosure: not present in the page returned during this run; other pages/records remain unverified.',
    '- Other app issues in reference sections 11.6-11.14 require targeted scenarios or source-level client validation and are not asserted by this API collection run.',
    '',
    '## Regression artifacts',
    '',
    '- `api-execution-report.pdf`: per-request status and response report.',
    '- `APP APIS EXECUTION with all response02.pdf`: full response appendix for every request.',
    '- `api-execution-report.json`: sanitized machine-readable response record.',
    ''
  ].join('\n');
}

async function generateBugPdf(outputPath, data) {
  const markdown = buildMarkdown(data);
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  const output = fs.createWriteStream(outputPath);
  doc.pipe(output);
  doc.font('Helvetica-Bold').fontSize(18).text('RCB Player API Regression Bug Report');
  doc.moveDown(0.4).font('Helvetica').fontSize(9);
  doc.text(`Reference: ${fs.existsSync(referencePath) ? 'APP-API-REFERENCE (1).md' : 'Developer API reference'}`);
  doc.text(`Collection requests: ${data.results.length}; app-used routes: ${data.appRouteCount} unique (${data.appExamples} examples).`);
  doc.text(`HTTP/business passes: ${data.executionSummary.passed}; failures: ${data.executionSummary.failed}; configuration warnings: ${data.executionSummary.configurationWarnings}.`);
  doc.moveDown();

  for (const finding of data.findings) {
    doc.font('Helvetica-Bold').fontSize(12)
      .text(`${finding.id} - ${finding.title} [${finding.severity}; ${finding.status}]`);
    doc.moveDown(0.2).font('Helvetica').fontSize(9);
    for (const line of finding.evidence) {
      doc.text(`- ${line}`, { paragraphGap: 3 });
    }
    doc.text(`Recommendation: ${finding.recommendation}`, { paragraphGap: 6 });
    doc.moveDown(0.4);
  }

  doc.font('Helvetica-Bold').fontSize(12).text('Coverage limitations');
  doc.moveDown(0.2).font('Helvetica').fontSize(9);
  doc.text('Sangam 344, geo restriction enabled behavior, and other withdrawal-history pages were not validated by this run. See the Markdown bug report for details.');
  doc.end();
  await new Promise((resolve, reject) => {
    output.on('finish', resolve);
    output.on('error', reject);
  });
}

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, '\\|');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
