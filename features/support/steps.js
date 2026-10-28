const assert = require('node:assert/strict');
const { When, Then } = require('@cucumber/cucumber');
const { getRuntime } = require('../../scripts/api-runtime');

When('I execute Postman request {int}', async function (requestId) {
  this.requestResult = await getRuntime().execute(requestId);
});

Then('the response status matches the collection expectation', function () {
  assert.ok(this.requestResult, 'The request did not produce a result.');
  if (this.requestResult.status === 'SKIPPED') {
    return 'pending';
  }
  assert.equal(
    this.requestResult.status,
    this.requestResult.expectedStatus,
    this.requestResult.error || `Expected HTTP ${this.requestResult.expectedStatus}, received ${this.requestResult.status}`
  );
});

Then('the response body matches its documented business contract', function () {
  assert.ok(this.requestResult, 'The request did not produce a result.');
  if (this.requestResult.status === 'SKIPPED') {
    return 'pending';
  }
  assert.equal(this.requestResult.assertionOutcome, 'PASS',
    (this.requestResult.assertionErrors || []).join('; ') || 'Response assertions did not pass.');
  if (this.requestResult.businessOutcome === 'NOT_ASSERTED') {
    return;
  }
  assert.notEqual(
    this.requestResult.businessOutcome,
    'FAIL',
    this.requestResult.businessMessage || 'Response did not match the documented business contract.'
  );
});
