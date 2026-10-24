const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { getRuntime, redactText, formatBinaryResponse } = require('../scripts/api-runtime');
const { generateReport, hasUnsuccessfulSuccessFlag } = require('../scripts/generate-report');
const {
  APP_USED_ROUTES,
  routeKey,
  documentedBusinessContract,
  evaluateBusinessContract
} = require('../scripts/api-contracts');

test('loads all 111 collection requests in Postman order', () => {
  const runtime = getRuntime();
  assert.equal(runtime.requests.length, 111);
  assert.equal(runtime.requests[0].name, 'Check the player API is up · health');
  assert.equal(runtime.requests[0].expectedStatus, 200);
  assert.equal(runtime.requests[110].name, 'Sign the player out · logout');
});

test('maps response values for later requests without persisting them to disk', () => {
  const runtime = getRuntime();
  const login = runtime.requests.find((request) => request.name.includes('Sign in as the player'));
  runtime.saveResponseVariables(login.item, JSON.stringify({
    token: 'unit-test-token',
    data: { id: 'unit-test-player', username: 'unit-test-user' }
  }));

  assert.equal(runtime.variable('player_token'), 'unit-test-token');
  assert.equal(runtime.variable('player_id'), 'unit-test-player');
  assert.equal(runtime.variable('player_username'), 'unit-test-user');

  const upload = runtime.requests.find((request) => request.name.includes('Send a photo to support'));
  runtime.saveResponseVariables(upload.item, JSON.stringify({ message: { image: 'unit-test-image-id' } }));
  assert.equal(runtime.variable('my_chat_file_id'), 'unit-test-image-id');
});

test('redacts sensitive values in JSON and unstructured response text', () => {
  const json = redactText(JSON.stringify({
    token: 'private-token',
    data: {
      email: 'person@example.test',
      payout_sending_by: 'admin@example.test',
      account_number: '123456789012',
      blocked_support: { players: [{ user_id: 'other-player-id', username: 'Private Player' }] },
      order_id: 'private-order-id',
      balance: 12
    }
  }));
  assert.match(json, /"\[REDACTED\]"/);
  assert.doesNotMatch(json, /private-token|person@example\.test|admin@example\.test|123456789012|other-player-id|Private Player|private-order-id/);

  const text = redactText('Authorization: Bearer private-token; contact 9876543210');
  assert.doesNotMatch(text, /private-token|9876543210/);
});

test('preserves complete non-text responses in base64 form', () => {
  const response = formatBinaryResponse(Buffer.from([1, 2, 3]));
  assert.match(response, /Base64: AQID/);
});

test('detects unsuccessful API business flags without changing HTTP assertions', () => {
  assert.equal(hasUnsuccessfulSuccessFlag('{"success":"0"}'), true);
  assert.equal(hasUnsuccessfulSuccessFlag('{"data":{"success":false}}'), true);
  assert.equal(hasUnsuccessfulSuccessFlag('{"success":"1"}'), false);
});

test('matches API and Postman-variable URLs to the app-used route manifest', () => {
  assert.equal(routeKey('GET', '{{player_api}}/support-chat/file/:id'), 'GET support-chat/file/:id');
  assert.equal(routeKey('GET', '{{player_root}}/health'), 'GET health');
  assert.equal(APP_USED_ROUTES.has('GET support-chat/file/:id'), true);
  assert.equal(APP_USED_ROUTES.has('POST register-step1'), false);
});

test('asserts documented negative outcomes and classifies missing support setup', () => {
  const retiredContract = documentedBusinessContract('POST', '{{player_api}}/register-step1');
  assert.equal(evaluateBusinessContract(retiredContract, JSON.stringify({
    success: '0',
    message: 'This is no longer available. New players register on WhatsApp.'
  })).status, 'PASS');

  const mismatch = evaluateBusinessContract(retiredContract, JSON.stringify({
    success: '1',
    message: 'Unexpected success'
  }));
  assert.equal(mismatch.status, 'FAIL');

  const supportContract = documentedBusinessContract('GET', '{{player_api}}/support-whatsapp');
  assert.equal(evaluateBusinessContract(supportContract, JSON.stringify({
    success: '2',
    message: 'No support WhatsApp number is configured'
  })).status, 'CONFIGURATION');

  const contactsContract = documentedBusinessContract('GET', '{{player_api}}/support-contacts');
  assert.equal(evaluateBusinessContract(contactsContract, JSON.stringify({
    success: '2',
    message: 'Successfully',
    data: { whatsapp: [], call: [], email: null, telegram: null }
  })).status, 'CONFIGURATION');
});

test('generates a PDF report containing response details', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcb-api-report-'));
  const jsonPath = path.join(tempDir, 'report.json');
  const pdfPath = path.join(tempDir, 'report.pdf');
  fs.writeFileSync(jsonPath, JSON.stringify([{
    id: 1,
    name: 'Health endpoint',
    method: 'GET',
    url: 'https://example.test/health',
    status: 200,
    expectedStatus: 200,
    outcome: 'PASS',
    response: '{"ok":true}'
  }]));

  try {
    const summary = await generateReport(jsonPath, pdfPath, 'Test collection');
    assert.equal(summary.passed, 1);
    assert.ok(fs.readFileSync(pdfPath).subarray(0, 4).equals(Buffer.from('%PDF')));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('does not call a photo endpoint when its required file ID is unavailable', async () => {
  const runtime = getRuntime();
  runtime.environment.delete('player_token');
  runtime.collectionVariables.delete('player_token');
  runtime.environment.delete('my_chat_file_id');
  runtime.collectionVariables.delete('my_chat_file_id');
  const result = await runtime.execute(85);
  assert.equal(result.status, 'SKIPPED');
  assert.match(result.response, /missing required path variable/);
});
