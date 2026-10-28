const fs = require('node:fs');
const collectionPath = 'player-app-api.postman_collection.json';
const collection = JSON.parse(fs.readFileSync(collectionPath));
if (collection.item.some((item) => item.name === 'Master suite - routing, authentication and list regression')) {
  console.log('Master regression cases already present.'); process.exit(0);
}
const items = [];
const missingSession = 'You are not logged in. Send your session token as Authorization: Bearer <token>.';
function add(caseId, method, route, status, message, options = {}) {
  const request = {
    method, url: options.root ? `{{player_root}}/${route}` : `{{player_api}}/${route}`,
    auth: options.auth || { type: 'noauth' }, header: options.headers || []
  };
  if (options.body !== undefined) {
    request.body = { mode: 'raw', raw: options.body };
    request.header.push({ key: 'Content-Type', value: 'application/json' });
  }
  items.push({ name: `${caseId} - ${options.label || `${method} ${route}`}`, request,
    'x-master-case': caseId, 'x-regression': true,
    'x-assertions': { kind: 'explicit', expectedSuccess: '0', equals: { message }, ...options.assertions },
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
      `pm.test('Expected HTTP status', () => pm.response.to.have.status(${status}));`,
      `pm.test('Expected refusal', () => { const j = pm.response.json(); pm.expect(j.success).to.eql('0'); pm.expect(j.message).to.eql(${JSON.stringify(message)}); });`
    ] } }]
  });
}
for (const [id, route, root] of [['002','no-such-route',false],['003','passbook-list',false],['004','no-such-page',true]]) {
  add(`TC-GEN-${id}`, 'GET', route, 404, `There is no GET ${root ? '' : '/api'}/${route} on this server. Check the address and the method (GET or POST).`, {
    root, ...(id === '003' ? { auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{player_token}}' }] } } : {})
  });
}
add('TC-GEN-005','POST','number-list',400,'The request body is not valid JSON.',{body:'{"type":"singlePana",'});
add('TC-GEN-006','POST','no-such-route',400,'The request body is not valid JSON.',{body:'{"broken":'});
add('TC-GEN-007','POST','number-list',413,'The request body is too large.',{body:JSON.stringify({type:'singlePana',pad:'x'.repeat(120000)})});
for (const [label, body] of [['mobile only','{"mobile":"{{player_mobile}}"}'],['password only','{"password":"{{player_password}}"}'],['empty','{}']]) {
  add('TC-AUTH-004','POST','user-login',200,'Mobile and password are required', { body, label, assertions: { absent: ['token'] } });
}
const routes = [
  'POST update-Withdrawal-Mobilenumbers','POST update-user-profile','POST change-password','POST update-notification','POST update-fcm-token',
  'POST passbook-list','POST video-list','GET support-chat','POST support-chat/send','POST support-chat/image','GET support-chat/file/abc',
  'POST support-chat/close','GET user-chat-count','GET notifiaction-list','GET notifiaction-seen','POST notifiaction-clear','GET getway-list',
  'POST deposit-history','GET deposit-status','GET deposit-history-pending-count','GET my-pending-markets','GET my-recent-wins',
  'POST main-market-bet-history','POST kingstarline-market-bet-history','POST kingJackport-market-bet-history','GET game-rate-list',
  'GET main-market-list','GET kingstarline-market-list','GET kingjackport-market-list','GET favourite-markets','POST favourite-markets',
  'POST favourite-markets/sync','POST withdraw-manage-permission','POST withdraw-add-bank-account','POST withdraw-list-bank-account',
  'POST withdraw-list-bank-account-success','POST withdraw-request-store','GET withdraw-request-list'
];
for (const key of routes) { const [method, route] = key.split(' '); add('TC-AUTH-030',method,route,401,missingSession); }
for (const value of ['Bearer ', 'Token abc', '{{player_token}}']) add('TC-AUTH-031','GET','getway-list',401,missingSession,{headers:[{key:'Authorization',value}],label:`Invalid Authorization format ${items.length}`});
for (const route of ['passbook-list','getway-list']) for (const token of ['abc.def.ghi','{{unsigned_token}}']) {
  add('TC-AUTH-033',route === 'passbook-list' ? 'POST':'GET',route,401,'Your session has expired. Please log in again.',{headers:[{key:'Authorization',value:`Bearer ${token}`}],label:`${route} ${token.includes('unsigned') ? 'unsigned' : 'malformed'} token`});
}
for (const key of ['GET get-profile-usser','GET referral-summary','POST referral-apply','GET bonus-announcements','POST bonus-announcements-seen','GET my-game-rates','POST bet-place']) {
  const [method, route] = key.split(' '); add('TC-AUTH-040',method,route,401,missingSession);
}
for (const type of ['unknown','', 'SinglePana']) add('TC-NUM-006','POST','number-list',200,'Unknown list type. Send type as one of: singlePana, doublePana, triplePana, halfSangam, fullSangam.',{body:JSON.stringify({type}),label:`Unknown list type ${JSON.stringify(type)}`});
collection.item.push({ name: 'Master suite - routing, authentication and list regression', item: items });
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2) + '\n');
console.log(`Added ${items.length} executable probes for 12 master cases (multi-request cases retain one master row).`);
