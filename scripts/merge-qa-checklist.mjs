import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { routeKey } = require('./api-contracts');
// The artifact runtime is optional for normal API execution; used only for CSV reconciliation.
const artifactRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'));
const { Workbook } = artifactRequire('@oai/artifact-tool');
const reportDir = 'reports/regression-2026-10-28-v229';
const masterPath = 'reports/APK_API_master_Testcase_suite.csv';
const collectionPath = 'player-app-api.postman_collection.json';
fs.mkdirSync(reportDir, { recursive: true });
const [incomingCsv, incomingCollection] = process.argv.slice(2);
if (!incomingCsv || !incomingCollection) throw new Error('Usage: node scripts/merge-qa-checklist.mjs incoming-master.csv incoming-collection.json');

async function readCsv(file) {
  const workbook = await Workbook.fromCSV(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''), { sheetName: 'Master' });
  const values = workbook.worksheets.getItemAt(0).getUsedRange().values;
  const headers = values[0];
  return { headers, rows: values.slice(1).filter((row) => row[1]).map((row) => Object.fromEntries(headers.map((key, i) => [key, String(row[i] ?? '')]))) };
}
const old = await readCsv(masterPath);
const incoming = await readCsv(incomingCsv);
if (JSON.stringify(old.headers) !== JSON.stringify(incoming.headers)) throw new Error('Master CSV headers differ; refusing a lossy merge.');
const byId = new Map(old.rows.map((row) => [row.Test_Case_ID, row]));
if (byId.size !== old.rows.length) throw new Error('Existing master contains duplicate case IDs.');
const comparison = { oldRows: old.rows.length, incomingRows: incoming.rows.length, added: [], corrected: [], unchanged: [], oldOnly: [] };
const incomingIds = new Set();
for (const row of incoming.rows) {
  if (incomingIds.has(row.Test_Case_ID)) throw new Error(`Duplicate incoming ID: ${row.Test_Case_ID}`);
  incomingIds.add(row.Test_Case_ID);
  const previous = byId.get(row.Test_Case_ID);
  if (!previous) {
    byId.set(row.Test_Case_ID, row); comparison.added.push(row.Test_Case_ID);
  } else {
    const fields = old.headers.filter((key) => previous[key] !== row[key]);
    if (fields.length) {
      comparison.corrected.push({ id: row.Test_Case_ID, fields, before: Object.fromEntries(fields.map((key) => [key, previous[key]])), after: Object.fromEntries(fields.map((key) => [key, row[key]])) });
      const history = `Prior record: ${previous.Status}; ${previous.Actual_Result}; expected ${previous.Expected_Result}`;
      byId.set(row.Test_Case_ID, { ...row, Remarks: `${row.Remarks}${row.Remarks ? ' | ' : ''}${history}` });
    } else comparison.unchanged.push(row.Test_Case_ID);
  }
}
comparison.oldOnly = old.rows.filter((row) => !incomingIds.has(row.Test_Case_ID)).map((row) => row.Test_Case_ID);
const collection = JSON.parse(fs.readFileSync(collectionPath));
const supplied = JSON.parse(fs.readFileSync(incomingCollection));
function flatten(items) { return items.flatMap((item) => item.item ? flatten(item.item) : item.request ? [item] : []); }
const original = flatten(collection.item).slice(0, 111);
// Keep the original 111 request IDs stable, including logout at 111.
const existingChecklist = flatten(collection.item).filter((item) => item['x-qa-checklist']);
const newItems = flatten(supplied.item);
if (newItems.length !== 22) throw new Error('Expected 22 ordered checklist scenarios.');
if (!existingChecklist.length) {
  let n = 0;
  for (const item of newItems) {
    item['x-qa-checklist'] = ++n;
    item['x-regression'] = true;
    if (n === 20 || n === 22) item['x-write-guarded'] = true;
  }
  collection.item.push({ name: 'QA 2.29 - Favourites, declaration times and Add Funds', item: supplied.item });
}
// Use the selected environment's existing base URLs; add only genuinely new defaults.
const environment = JSON.parse(fs.readFileSync('rcb-matka-live.postman_environment.json'));
const defined = new Set([...collection.variable || [], ...environment.values || []].map((entry) => entry.key));
for (const variable of supplied.variable || []) if (!defined.has(variable.key)) {
  (collection.variable ||= []).push(variable); defined.add(variable.key);
}
const readRoutes = new Set(['get-profile-usser','main-market-list','kingstarline-market-list','kingjackport-market-list','app-setting-list','user-notice-board','bonus-announcements','my-pending-markets','my-recent-wins','support-contacts','support-whatsapp','onboarding-whatsapp','my-game-rates','main-market-gameRate-list','king-starline-gameRate-list','king-jackport-gameRate-list','number-list','number-list-single-double-triple','number-list-penal-group','main-market-bet-history','kingstarline-market-bet-history','kingJackport-market-bet-history','getway-list','deposit-history-pending-count','deposit-history','withdraw-manage-permission','withdraw-list-bank-account','withdraw-list-bank-account-success','withdraw-request-list','passbook-list','notifiaction-list','user-chat-count','support-chat','referral-summary','main-market-time-table','game-rate-list','video-list']);
for (const [index, item] of original.entries()) {
  const key = routeKey(item.request.method, item.request.url.raw || item.request.url);
  item['x-regression'] = index === 0 || index === 1 || readRoutes.has(key.slice(key.indexOf(' ') + 1));
  const row = byId.get(`API-${String(index + 1).padStart(3, '0')}`);
  if (row?.Status.startsWith('SUPERSEDED')) {
    item['x-retired'] = true;
    item['x-regression'] = true;
    const route = key.slice(key.indexOf(' ') + 1);
    item['x-assertions'] = { kind: 'explicit', expectedSuccess: '0', equals: { message: `There is no ${item.request.method} /api/${route} on this server. Check the address and the method (GET or POST).` } };
    // The original mapping scripts remain available; the HTTP assertion reflects the supplied current route disposition.
    for (const event of item.event || []) if (event.listen === 'test') event.script.exec = event.script.exec.map((line) => line.replace(/pm\.response\.to\.have\.status\(\s*\d+\s*\)/g, 'pm.response.to.have.status(404)'));
  }
}
for (const item of flatten(collection.item).filter((item) => item['x-qa-checklist'])) {
  const n = item['x-qa-checklist'];
  const id = `NEW-${String(n).padStart(3, '0')}`;
  if (!byId.has(id)) byId.set(id, {
    Test_Cycle: 'QA-2.29-REGRESSION-2026-10-28', Test_Case_ID: id,
    Source_Evidence: `${path.basename(incomingCollection)}; player-app-api.postman_collection.json`,
    Category: n < 19 ? 'Favourites / result declaration times' : 'Add Funds / PG regression',
    Scenario: item.name, Method: item.request.method, Endpoint: item.request.url.raw,
    Expected_Result: (item.event || []).filter((event) => event.listen === 'test').flatMap((event) => event.script.exec).join('\n'),
    Actual_Result: '', Status: 'NOT RUN', Environment: n === 20 || n === 22 ? 'Production test player; starts or reopens an unpaid PG order' : 'Production test player', Remarks: `Merged collection request ${111 + n}; explicit assertions in scripts/new-feature-contracts.js.`
  });
}
fs.writeFileSync(collectionPath, `${JSON.stringify(collection, null, 2)}\n`);
const rows = [...byId.values()];
const workbook = Workbook.create();
const sheet = workbook.worksheets.add('Master');
sheet.getRange(`A1:L${rows.length + 1}`).values = [old.headers, ...rows.map((row) => old.headers.map((key) => row[key]))];
workbook.recalculate();
const matrix = sheet.getUsedRange().values;
if (matrix.length !== rows.length + 1) throw new Error('CSV row verification failed');
// CSV has no formatting or formulas; serialize the verified artifact-tool matrix without creating a second workbook file.
fs.writeFileSync(masterPath, matrix.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n') + '\r\n');
comparison.checklistScenarios = 22;
comparison.finalRows = rows.length;
comparison.originalRequestsPreserved = 111;
comparison.mergedRequests = flatten(collection.item).length;
fs.writeFileSync(`${reportDir}/suite-comparison.json`, JSON.stringify(comparison, null, 2) + '\n');
console.log(JSON.stringify({ oldRows: comparison.oldRows, incomingRows: comparison.incomingRows, added: comparison.added.length, corrected: comparison.corrected.length, finalRows: rows.length, requests: comparison.mergedRequests }));
