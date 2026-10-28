const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateNewFeature, prepareNewFeature } = require('../scripts/new-feature-contracts');
const { getRuntime } = require('../scripts/api-runtime');
function runtime(values = {}) {
  const collectionVariables = new Map(Object.entries(values));
  return { collectionVariables, variable: (key) => collectionVariables.get(key) || '' };
}
function evaluate(n, body, state = runtime()) {
  return evaluateNewFeature(n, { text: JSON.stringify(body), contentType: 'application/json' }, state);
}
test('keeps original request IDs and integrates 22 ordered checklist scenarios', () => {
  const requests = getRuntime().requests;
  assert.match(requests[110].name, /Sign the player out .* logout/);
  assert.deepEqual(requests.filter((r) => r.item['x-qa-checklist']).map((r) => r.item['x-qa-checklist']), Array.from({ length: 22 }, (_, i) => i + 1));
  assert.equal(requests[130].item['x-write-guarded'], true);
  assert.equal(requests[132].item['x-write-guarded'], true);
});
test('requires runtime prerequisites and a started order for duplicate payment', () => {
  assert.match(prepareNewFeature({ 'x-qa-checklist': 6 }, runtime()), /original favourites snapshot/);
  assert.match(prepareNewFeature({ 'x-qa-checklist': 6 }, runtime({fav_before:'[]'})), /fav_main_id/);
  assert.match(prepareNewFeature({ 'x-qa-checklist': 22 }, runtime()), /requires/);
  assert.equal(prepareNewFeature({ 'x-qa-checklist': 22 }, runtime({ payin_result: 'ok' })), '');
});
test('revised NEW-022 creates a fresh order for INR 600 and uses the separate HTTP assertion', () => {
  const state=runtime({player_user_id:'test-user',order_id:'old-order'});
  const item={'x-qa-checklist':22,'x-payment-check':'unique-order-http-200'};
  assert.equal(prepareNewFeature(item,state),'');
  assert.equal(state.variable('deposit_amount'),'600');
  assert.match(state.variable('order_id'),/^\d{16}$/);
  assert.notEqual(state.variable('order_id'),'old-order');
  assert.equal(evaluateNewFeature(22,{text:'any response'},state,item).status,'PASS');
});
test('captures original favourites and demands complete restoration', () => {
  const state = runtime();
  assert.equal(evaluate(2, { success: '1', message: '1 favourite market.', data: { market_ids: ['existing'] } }, state).status, 'PASS');
  assert.equal(state.variable('fav_before'), '["existing"]');
  assert.equal(evaluate(18, { success: '1', message: 'Removed from your favourites.', data: { market_ids: [] } }, state).status, 'FAIL');
  assert.equal(evaluate(18, { success: '1', message: 'Removed from your favourites.', data: { market_ids: ['existing'] } }, state).status, 'PASS');
});
test('checks declared times against result state and prevents missing data from passing', () => {
  assert.equal(evaluate(3, { success: '1', data: [{ result: '***-**-***', open_declared_at: null, close_declared_at: null }] }).status, 'PASS');
  assert.equal(evaluate(3, { success: '1', data: [{ result: '123-45-678', open_declared_at: null, close_declared_at: null }] }).status, 'FAIL');
  assert.equal(evaluate(4, { success: '1' }).status, 'FAIL');
});
test('validates the payment failure branch and rejects an HTML page without a gateway verdict', () => {
  const state = runtime({ deposit_amount: '100' });
  const response = {
    text: '<h1>Adding funds is not available right now</h1>Online payment is not working at the moment. No money has left your account. Please contact our support team to add funds. Reference: <b>0123456789ab</b> Back to home',
    contentType: 'text/html', headers: new Headers({ 'x-payin-result': 'pg_unavailable', 'x-payin-reason': 'transport', 'x-payin-ref': '0123456789ab' })
  };
  assert.equal(evaluateNewFeature(20, response, state).status, 'PASS');
  assert.equal(state.variable('payin_result'), 'pg_unavailable');
  assert.equal(evaluateNewFeature(20, { ...response, headers: new Headers() }, state).status, 'FAIL');
});
