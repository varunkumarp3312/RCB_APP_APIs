const assert = require('node:assert/strict');
const { randomInt } = require('node:crypto');

// Explicit ports of the supplied 2.29 checklist assertions; no source scripts are evaluated.
function prepareNewFeature(item, runtime) {
  const n = item['x-qa-checklist'];
  if (!n) return '';
  if (n === 22 && item['x-payment-check'] === 'unique-order-http-200') {
    if (!runtime.variable('player_user_id')) return 'Missing player_user_id; load the signed-in profile first.';
    runtime.collectionVariables.set('deposit_amount', '600');
    runtime.collectionVariables.set('order_id', `${Date.now()}${String(randomInt(1000)).padStart(3, '0')}`.slice(0, 16));
    return '';
  }
  if ([3,4,6,7,8,9,12,14,15,16,17,18].includes(n) && !runtime.variable('fav_before')) {
    return 'Missing original favourites snapshot; run checklist request 2 before selecting or changing favourites.';
  }
  const required = n === 6 || n === 7 || n === 12 || n === 18 ? ['fav_main_id']
    : [8, 9, 16].includes(n) ? ['fav_main_id', 'fav_draw_id']
      : [14, 15, 17].includes(n) ? ['fav_draw_id']
        : n === 20 ? ['player_user_id'] : n === 21 ? ['payin_result'] : [];
  const missing = required.filter((key) => !runtime.variable(key));
  if (missing.length) return `Missing checklist prerequisites: ${missing.join(', ')}`;
  if (n === 22 && runtime.variable('payin_result') !== 'ok') return 'Duplicate-payment case requires a successfully started unpaid PG order.';
  if (n === 20) {
    runtime.collectionVariables.set('payin_result', '');
    runtime.collectionVariables.set('order_id', `${Date.now()}${String(randomInt(1000)).padStart(3, '0')}`.slice(0, 16));
  }
  return '';
}

function evaluateNewFeature(n, response, runtime, item = {}) {
  if (n === 22 && item['x-payment-check'] === 'unique-order-http-200') {
    return { status: 'PASS', errors: [], assertions: 0 }; // HTTP status is asserted separately by the runtime.
  }
  const errors = [];
  let assertions = 0;
  const check = (name, fn) => {
    assertions += 1;
    try { fn(); } catch { errors.push(name); }
  };
  const v = (key) => runtime.variable(key);
  const save = (key, value) => runtime.collectionVariables.set(key, String(value ?? ''));
  const eq = (name, actual, expected) => check(name, () => assert.deepEqual(actual, expected));
  let j;
  if (![20, 22].includes(n)) {
    try { j = JSON.parse(response.text); } catch { return { status: 'FAIL', errors: ['Expected valid JSON'], assertions: 1 }; }
    if (!j || typeof j !== 'object' || Array.isArray(j)) return { status: 'FAIL', errors: ['Expected a JSON object'], assertions: 1 };
    check('JSON Content-Type', () => assert.match(response.contentType, /application\/(?:[\w.-]+\+)?json/i));
  }
  const ids = j?.data?.market_ids;
  const list = () => check('data.market_ids is an array of strings', () => {
    assert.ok(Array.isArray(ids)); assert.ok(ids.every((id) => typeof id === 'string'));
  });
  const success = () => eq('success is "1"', j.success, '1');
  const message = (expected) => eq('documented response message', j.message, expected);
  const main = v('fav_main_id'); const draw = v('fav_draw_id');
  if (n === 1) {
    success();
    check('Non-empty session token', () => assert.ok(typeof j.token === 'string' && j.token.trim()));
    if (!errors.length) {
      save('player_token', j.token);
      save('unsigned_token', `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${j.token.split('.')[1]}.`);
    }
  } else if (n === 2 || n === 9) {
    success(); list();
    message(ids?.length ? `${ids.length} favourite market${ids.length === 1 ? '' : 's'}.` : 'No favourite markets yet.');
    if (n === 2 && !errors.length) save('fav_before', JSON.stringify(ids));
    if (n === 9) eq('Added markets retain insertion order', ids?.slice(-2), [main, draw]);
  } else if ([3, 4, 5].includes(n)) {
    check('success is 1 or documented empty-list 2', () => assert.ok(['1', '2'].includes(j.success)));
    check('data is a market array', () => assert.ok(Array.isArray(j.data)));
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+05:30$/;
    for (const [i, m] of (Array.isArray(j.data) ? j.data : []).entries()) {
      const result = String(m.result);
      const fields = n === 3 ? ['open_declared_at', 'close_declared_at'] : ['declared_at'];
      for (const field of fields) check(`market ${i}: ${field} matches declaration state`, () => {
        assert.ok(Object.hasOwn(m, field));
        const pending = n === 3 ? result === '***-**-***' || (field === 'close_declared_at' && !/^\d{3}-\d{2}-\d{3}$/.test(result))
          : result === (n === 4 ? '***-*' : '**');
        if (pending) assert.equal(m[field], null); else assert.match(m[field], iso);
      });
    }
    if (n === 3 || n === 4) {
      const before = JSON.parse(v('fav_before') || '[]');
      const pick = (Array.isArray(j.data) ? j.data : []).find((m) => m.market_id && !before.includes(String(m.market_id)) && (n === 3 || m.market_id !== main));
      // Data selection is a prerequisite, independent of whether declaration checks passed.
      save(n === 3 ? 'fav_main_id' : 'fav_draw_id', pick ? String(pick.market_id) : '');
    }
  } else if ([6, 7, 8, 14, 15, 16, 17, 18].includes(n)) {
    success(); list();
    message([6, 8].includes(n) ? 'Added to your favourites.' : n === 7 ? 'This market is already in your favourites.'
      : n === 15 ? 'This market is not in your favourites.' : n === 16 ? 'Your favourite markets are saved.' : 'Removed from your favourites.');
    if (n === 6) eq('Main market is last', ids?.at(-1), main);
    if (n === 7) eq('Main market appears once', ids?.filter((id) => id === main).length, 1);
    if (n === 8 || n === 16) eq('Insertion order preserved', ids?.slice(-2), [main, draw]);
    if (n === 16) {
      eq('Main appears once', ids?.filter((id) => id === main).length, 1);
      eq('Draw appears once', ids?.filter((id) => id === draw).length, 1);
      check('Unknown market filtered', () => assert.ok(!ids.includes('NoSuchMarket2610')));
    }
    if ([14, 15, 17].includes(n)) check('Draw removed', () => assert.ok(!ids.includes(draw)));
    if (n === 18) eq('Original favourites fully restored', ids, JSON.parse(v('fav_before') || '[]'));
  } else if ([10, 11, 12, 13].includes(n)) {
    eq('Refused with success "0"', j.success, '0');
    message(n === 10 ? 'This market is not available.' : n === 11 ? 'Choose a market: send its market_id.'
      : n === 12 ? 'Send favourite "1" to add the market or "0" to remove it.'
        : 'You are not logged in. Send your session token as Authorization: Bearer <token>.');
  } else if (n === 19) {
    success(); eq('Active player', j.data?.status, 'active');
    check('Player user_id present', () => assert.ok(typeof j.data?.user_id === 'string' && j.data.user_id));
    if (!errors.length) save('player_user_id', j.data.user_id);
  } else if (n === 20 || n === 22) {
    const html = response.text;
    const result = response.headers.get('x-payin-result') || '';
    const reason = response.headers.get('x-payin-reason') || '';
    const ref = response.headers.get('x-payin-ref') || '';
    const title = ((html.match(/<h1[^>]*>([^<]*)<\/h1>/) || [])[1] || '').trim();
    check('HTML Content-Type', () => assert.match(response.contentType, /text\/html/i));
    check('12-character payment reference', () => assert.match(ref, /^[0-9a-f]{12}$/));
    const contains = (name, text) => check(name, () => assert.ok(html.includes(text)));
    if (n === 20) {
      save('payin_result', result);
      check('Payment gateway verdict', () => assert.ok(['ok', 'pg_unavailable'].includes(result)));
      const inr = (value) => Math.round(Number(value)).toLocaleString('en-IN');
      if (result === 'ok') {
        const src = (html.match(/<img src="(data:image\/svg\+xml;base64,[^"]+)"/) || [])[1] || '';
        check('Inline SVG QR', () => assert.ok(src && Buffer.from(src.split(',')[1], 'base64').toString().includes('<svg')));
        check('No external QR file', () => assert.ok(!html.includes('uploads/qrcode_')));
        contains('Entered amount under QR', `Pay <span>&#8377;${inr(v('deposit_amount'))}</span>`);
        check('QR tab selected', () => assert.match(html, /data-choice="qr"\s+aria-controls="pane-qr"\s+aria-selected="true"/));
        check('UPI tab available', () => assert.match(html, /data-choice="app"\s+aria-controls="pane-app"\s+aria-selected="false"/));
        contains('UPI deep link', 'upi://pay?');
      } else if (result === 'pg_unavailable') {
        check('Known gateway failure reason', () => assert.ok(['transport', 'blocked', 'pg_error', 'auth', 'refused', 'undecryptable', 'no_link'].includes(reason)));
        eq('Unavailable title', title, 'Adding funds is not available right now');
        contains('No money left account notice', 'Online payment is not working at the moment. No money has left your account. Please contact our support team to add funds.');
        contains('Reference displayed', `Reference: <b>${ref}</b>`); contains('Back navigation', 'Back to home');
        const wa = (html.match(/href="(https:\/\/wa\.me\/[^\"]+)"/) || [])[1];
        if (wa) eq('WhatsApp message includes amount, order and reference', decodeURIComponent(wa.replace(/&amp;/g, '&').split('?text=')[1] || ''),
          `Hello Support, I could not add ₹${inr(v('deposit_amount'))} (Order ID ${v('order_id')}, Ref ${ref}). Please help me add funds.`);
      }
    } else {
      eq('Duplicate order verdict', result, 'duplicate_order'); eq('Duplicate reason', reason, 'duplicate');
      eq('Duplicate title', title, 'Payment could not be started');
      contains('Duplicate explanation', 'This payment was already started once. No money has left your account. Please go back and start Add Funds again.');
      contains('Back navigation', 'Back to home'); contains('Reference displayed', `Reference: <b>${ref}</b>`);
      check('No WhatsApp for duplicate orders', () => assert.ok(!html.includes('https://wa.me/')));
    }
  } else if (n === 21) {
    if (v('payin_result') === 'ok') {
      success(); message('Waiting for the payment to be confirmed.');
      eq('Pending order', j.data?.status, 'pending'); eq('Matching order', j.data?.order_id, v('order_id'));
      eq('Matching amount', Number(j.data?.amount), Number(v('deposit_amount'))); eq('PG gateway', j.data?.gateway, 'pg');
    } else {
      eq('Not found success flag', j.success, '2'); eq('Order not saved', j.data?.status, 'not_found');
      message(`No deposit with order id ${v('order_id')} was found on your account.`);
    }
  } else errors.push('Unknown checklist scenario');
  return { status: errors.length ? 'FAIL' : 'PASS', errors, assertions };
}

module.exports = { prepareNewFeature, evaluateNewFeature };
