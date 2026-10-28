const assert = require('node:assert/strict');
const test = require('node:test');
const { assertionContract, evaluateAssertions } = require('../scripts/api-assertions');
const { getRuntime } = require('../scripts/api-runtime');

function check(contract, body, extra = {}, business) {
  return evaluateAssertions(contract, {
    text: JSON.stringify(body), contentType: 'application/json', durationMs: 10, ...extra
  }, business);
}

test('all 111 requests have response assertion contracts based on saved examples', () => {
  const requests = getRuntime().requests.slice(0, 111);
  assert.equal(requests.length, 111);
  for (const request of requests) {
    const contract = request.assertionContract;
    assert.ok(contract, request.name);
    const example = request.item.response[0];
    if (request.item['x-retired'] || request.item['x-contract-source']) {
      if (request.item['x-retired']) assert.equal(request.expectedStatus, 404);
      assert.equal(contract.kind, 'explicit');
      continue; // Current contracts supersede historical examples; validated in regression.
    }
    if (contract.kind === 'image') continue;
    const result = contract.kind === 'json' || contract.kind === 'explicit'
      ? check(contract, JSON.parse(example.body))
      : evaluateAssertions(contract, { text: example.body, contentType: 'text/plain' });
    assert.equal(result.status, 'PASS', `${request.id}: ${result.errors.join('; ')}`);
  }
});

test('rejects malformed JSON, null, wrong content type, missing fields and business failure', () => {
  const contract = assertionContract({ request: {}, response: [{ body: '{"success":"1","data":[{"amount":10}]}' }] });
  for (const body of [null, {}, { success: '0', data: [] }, { success: '1', data: {} }, { success: '1', data: [{ amount: '10' }] }]) {
    assert.equal(check(contract, body).status, 'FAIL');
  }
  assert.equal(check(contract, {}, { text: '{broken' }).status, 'FAIL');
  assert.equal(check(contract, { success: '1', data: [] }, { contentType: 'text/html' }).status, 'FAIL');
  assert.equal(check(contract, { success: '1', data: [] }).status, 'PASS');
});

test('validates every array entry and permits extra fields and changing values', () => {
  const contract = assertionContract({ request: {}, response: [{ body: '{"data":[{"amount":10}]}' }] });
  assert.equal(check(contract, { data: [{ amount: 15 }, { amount: 'bad' }] }).status, 'FAIL');
  assert.equal(check(contract, { data: [{ amount: 20, extra: true }], extra: true }).status, 'PASS');
});

test('supports case-specific equality, nonempty values and timing overrides', () => {
  const contract = assertionContract({ request: {}, response: [{ body: '{"success":"0","message":"Refused"}' }],
    'x-assertions': { equals: { message: 'Refused' }, nonEmpty: ['message'], maxResponseMs: 50 } });
  assert.equal(check(contract, { success: '0', message: 'Refused' }).status, 'PASS');
  assert.equal(check(contract, { success: '0', message: 'Wrong' }).status, 'FAIL');
  assert.equal(check(contract, { success: '0', message: '' }).status, 'FAIL');
  assert.equal(check(contract, { success: '0', message: 'Refused' }, { durationMs: 51 }).status, 'FAIL');
});

test('keeps documented support configuration outcomes and rejects fake image bodies', () => {
  const contract = assertionContract({ request: {}, response: [{ body: '{"success":"1","data":{"msisdn":"123"}}' }] });
  assert.equal(check(contract, { success: '2' }, {}, { status: 'CONFIGURATION' }).status, 'PASS');
  const image = { kind: 'image' };
  assert.equal(evaluateAssertions(image, { contentType: 'image/png', bytes: Buffer.from('not an image') }).status, 'FAIL');
  assert.equal(evaluateAssertions(image, { contentType: 'image/png', bytes: Buffer.from([137,80,78,71,13,10,26,10]) }).status, 'PASS');
});
