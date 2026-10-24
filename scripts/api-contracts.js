const APP_USED_ROUTES = new Set([
  'POST user-login',
  'POST logout',
  'GET get-profile-usser',
  'POST change-password',
  'POST update-user-profile',
  'POST update-notification',
  'POST update-fcm-token',
  'POST front-user-contact-us',
  'GET app-setting-list',
  'GET main-market-list',
  'GET kingstarline-market-list',
  'GET kingjackport-market-list',
  'GET my-pending-markets',
  'GET my-recent-wins',
  'GET main-market-gameRate-list',
  'GET king-starline-gameRate-list',
  'GET king-jackport-gameRate-list',
  'GET game-rate-list',
  'GET my-game-rates',
  'GET main-market-time-table',
  'POST bet-place',
  'POST number-list',
  'POST number-list-single-double-triple',
  'POST number-list-penal-group',
  'POST main-market-bet-history',
  'POST kingstarline-market-bet-history',
  'POST kingJackport-market-bet-history',
  'GET getway-list',
  'GET deposit-history-pending-count',
  'GET deposit-status',
  'POST deposit-history',
  'GET withdraw-request-list',
  'POST withdraw-manage-permission',
  'POST withdraw-add-bank-account',
  'POST withdraw-list-bank-account',
  'POST withdraw-list-bank-account-success',
  'POST withdraw-request-store',
  'POST update-Withdrawal-Mobilenumbers',
  'POST passbook-list',
  'GET notifiaction-list',
  'GET notifiaction-seen',
  'POST notifiaction-clear',
  'GET support-whatsapp',
  'GET support-contacts',
  'GET onboarding-whatsapp',
  'GET support-chat',
  'POST support-chat/send',
  'POST support-chat/image',
  'GET support-chat/file/:id',
  'POST support-chat/close',
  'GET user-chat-count',
  'GET referral-summary',
  'POST referral-apply',
  'GET bonus-announcements',
  'POST bonus-announcements-seen',
  'POST user-notice-board',
  'POST video-list'
]);

const ROUTE_CONTRACTS = new Map([
  ['POST change-password', {
    name: 'documented password validation refusal',
    expectedSuccess: '0',
    expectedMessage: 'New password must be different from your current password'
  }],
  ['POST referral-apply', {
    name: 'documented own-referral-code refusal',
    expectedSuccess: '0',
    expectedMessage: "You can't use your own referral code."
  }],
  ...[
    'register-step1',
    'register-step2',
    'register-step3',
    'register-step4',
    'user-signup',
    'check-user-mobile-registration',
    'Verify-mpin',
    'recoveryAccount',
    'change-mpin',
    'forget-mpin-otpsend',
    'forget-mpin-updatempin'
  ].map((route) => [`POST ${route}`, {
    name: 'retired registration/MPIN route',
    expectedSuccess: '0',
    expectedMessage: 'This is no longer available. New players register on WhatsApp.'
  }]),
  ...[
    'send-otp-for-forgot-password',
    'forgot-password-verify-otp',
    'forgot-password-reset'
  ].map((route) => [`POST ${route}`, {
    name: 'retired password-reset route',
    expectedSuccess: 0,
    expectedMessage: 'Password reset by SMS is not available right now. Please contact support on WhatsApp.'
  }]),
  ['POST deposit-success', {
    name: 'retired deposit callback route',
    expectedSuccess: '0',
    expectedMessage: 'This is no longer available.'
  }],
  ['POST register-jmeter', {
    name: 'disabled test-account registration route',
    expectedSuccess: '0',
    expectedMessage: 'Not found'
  }]
]);

function routeKey(method, rawUrl) {
  const originalUrl = String(rawUrl || '');
  const postmanBase = originalUrl.match(/^\{\{[^}]+\}\}(\/[^?#]*)?/);
  const url = originalUrl.replace(/\{\{[^}]+\}\}/g, '');
  const apiPath = url.match(/\/api\/([^?#]*)/i);
  const healthPath = url.match(/\/health(?:[?#]|$)/i);
  const postmanPath = postmanBase?.[1];
  const route = postmanPath
    ? postmanPath.replace(/^\/+|\/+$/g, '')
    : apiPath
    ? apiPath[1].replace(/\/+$/, '')
    : healthPath
      ? 'health'
      : url.split(/[?#]/, 1)[0].split('/').filter(Boolean).pop() || '';
  return `${String(method || 'GET').toUpperCase()} ${route}`;
}

function documentedBusinessContract(method, rawUrl) {
  const key = routeKey(method, rawUrl);
  const routeContract = ROUTE_CONTRACTS.get(key);
  if (routeContract) {
    return { kind: 'exact', routeKey: key, ...routeContract };
  }
  if (key === 'GET support-contacts') {
    return { kind: 'support-contacts', routeKey: key, name: 'documented support contacts response' };
  }
  if (key === 'GET support-whatsapp') {
    return { kind: 'support-whatsapp', routeKey: key, name: 'documented support WhatsApp response' };
  }
  if (key === 'GET onboarding-whatsapp') {
    return { kind: 'onboarding-whatsapp', routeKey: key, name: 'documented onboarding WhatsApp response' };
  }
  return null;
}

function evaluateBusinessContract(contract, responseBody) {
  if (!contract) {
    return null;
  }

  let body;
  try {
    body = JSON.parse(responseBody);
  } catch {
    return { status: 'FAIL', message: 'Expected a JSON response for the documented business contract.' };
  }

  if (contract.kind === 'exact') {
    const matches = body.success === contract.expectedSuccess
      && body.message === contract.expectedMessage;
    return {
      status: matches ? 'PASS' : 'FAIL',
      expectedSuccess: contract.expectedSuccess,
      expectedMessage: contract.expectedMessage,
      actualSuccess: body.success,
      actualMessage: body.message,
      message: matches ? '' : `Expected success=${JSON.stringify(contract.expectedSuccess)} and the documented refusal message.`
    };
  }

  if (contract.kind === 'support-contacts') {
    const validSuccess = body.success === '1' || body.success === '2';
    const hasContactLists = body.data
      && Array.isArray(body.data.whatsapp)
      && Array.isArray(body.data.call);
    if (body.success === '1' && hasContactLists) {
      return { status: 'PASS', actualSuccess: body.success };
    }
    if (body.success === '2') {
      return {
        status: 'CONFIGURATION',
        actualSuccess: body.success,
        message: 'No support WhatsApp or call number is configured; the API returned the documented empty-configuration response.'
      };
    }
    return {
      status: 'FAIL',
      actualSuccess: body.success,
      message: validSuccess
        ? 'A successful support contacts response is missing the documented contact-list shape.'
        : 'Expected documented success "1" or the empty-configuration success "2".'
    };
  }

  if (contract.kind === 'support-whatsapp' || contract.kind === 'onboarding-whatsapp') {
    if (body.success === '1' && body.data && typeof body.data.msisdn === 'string' && body.data.msisdn.length > 0) {
      return { status: 'PASS', actualSuccess: body.success };
    }
    if (body.success === '2') {
      return {
        status: 'CONFIGURATION',
        actualSuccess: body.success,
        message: `No ${contract.kind === 'support-whatsapp' ? 'support' : 'onboarding'} WhatsApp number is configured; the API returned the documented no-number response.`
      };
    }
    return {
      status: 'FAIL',
      actualSuccess: body.success,
      message: 'Expected a documented configured-number response with data.msisdn or success "2" when no number is configured.'
    };
  }

  return null;
}

module.exports = {
  APP_USED_ROUTES,
  routeKey,
  documentedBusinessContract,
  evaluateBusinessContract
};
