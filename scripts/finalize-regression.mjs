import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const artifactRequire = createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'));
const { Workbook } = artifactRequire('@oai/artifact-tool');
const { generateReport } = require('./generate-report');
const root = 'reports/regression-2026-10-28-v229';
const masterPath = 'reports/APK_API_master_Testcase_suite.csv';
const sources = ['api-execution-report.json','retest/api-execution-report.json','contract-retest/api-execution-report.json'];
const latest = new Map();
const runs = [];
for (const source of sources) {
  const rows = JSON.parse(fs.readFileSync(`${root}/${source}`));
  runs.push({ source, total:rows.length, passed:rows.filter((row)=>row.outcome==='PASS').length, failed:rows.filter((row)=>row.outcome==='FAIL').length });
  for (const row of rows) latest.set(row.id,{...row, evidenceSource:`${root}/${source}`});
}
const results = [...latest.values()].sort((a,b)=>a.id-b.id);
const collection = JSON.parse(fs.readFileSync('player-app-api.postman_collection.json'));
function flatten(items) {return items.flatMap((item)=>item.item?flatten(item.item):item.request?[item]:[]);}
const requests = flatten(collection.item);
const workbook = await Workbook.fromCSV(fs.readFileSync(masterPath,'utf8'),{sheetName:'Master'});
const sheet = workbook.worksheets.getItemAt(0);
const values = sheet.getUsedRange().values;
const headers = values[0];
const master = values.slice(1).map((row)=>Object.fromEntries(headers.map((key,i)=>[key,String(row[i]??'')])));
const evidence = new Map();
const add = (id,row)=> {if(!evidence.has(id))evidence.set(id,[]);evidence.get(id).push(row);};
for (const result of results) {
  if (result.id<=111) add(`API-${String(result.id).padStart(3,'0')}`,result);
  const item = requests[result.id-1];
  if (item['x-qa-checklist']) add(`NEW-${String(item['x-qa-checklist']).padStart(3,'0')}`,result);
  if (item['x-master-case']) add(item['x-master-case'],result);
}
add('TC-GEN-001',latest.get(1));
const coverage=[];
const checklistExpectations = [
  'HTTP 200; success "1"; non-empty session token saved for later requests.',
  'HTTP 200; success "1"; data.market_ids is a string array; message states the correct count; original list captured.',
  'HTTP 200; success "1" or "2"; main markets have open_declared_at and close_declared_at, null for pending results and IST ISO timestamps for declared results.',
  'HTTP 200; success "1" or "2"; each Starline draw has declared_at, null until declared and otherwise an IST ISO timestamp.',
  'HTTP 200; success "1" or "2"; each Jackpot draw has declared_at, null until declared and otherwise an IST ISO timestamp.',
  'HTTP 200; success "1"; "Added to your favourites."; selected main market is last.',
  'HTTP 200; "This market is already in your favourites."; main market appears exactly once.',
  'HTTP 200; "Added to your favourites."; main and Starline IDs are the final two entries in insertion order.',
  'HTTP 200; success "1"; count message matches list length and inserted IDs retain order.',
  'HTTP 400; success "0"; "This market is not available."',
  'HTTP 400; success "0"; "Choose a market: send its market_id."',
  'HTTP 400; success "0"; message: Send favourite "1" to add the market or "0" to remove it.',
  'HTTP 401; success "0"; documented missing-session message.',
  'HTTP 200; "Removed from your favourites."; Starline ID absent.',
  'HTTP 200; "This market is not in your favourites."; Starline ID remains absent.',
  'HTTP 200; "Your favourite markets are saved."; insertion order retained, each selected ID appears once, unknown market filtered.',
  'HTTP 200; "Removed from your favourites."; Starline ID absent during cleanup.',
  'HTTP 200; "Removed from your favourites."; complete original favourites list restored.',
  'HTTP 200; success "1"; active player with non-empty user_id captured for Add Funds.',
  'HTTP 200 HTML; gateway verdict ok or pg_unavailable; 12-character reference. P1: inline SVG QR, correct amount and QR/UPI controls. P2: documented failure reason, unavailable explanation, reference, home navigation and configured support link.',
  'HTTP 200; P1: matching pending PG deposit, order ID and amount. P2: success "2", not_found, correct order-specific message.',
  'HTTP 200 HTML; X-Payin-Result duplicate_order, X-Payin-Reason duplicate; title "Payment could not be started"; repeat-order explanation, reference and Back to home, without WhatsApp.'
];
for(const row of master) {
  if(row.Test_Case_ID.startsWith('NEW-')) row.Expected_Result=checklistExpectations[Number(row.Test_Case_ID.slice(4))-1];
  const matches=evidence.get(row.Test_Case_ID)||[];
  if(matches.length) {
    const previous=`Historical register: ${row.Status}; ${row.Actual_Result}`;
    if(!row.Remarks.includes('Regression 2026-10-28')) row.Remarks+=`${row.Remarks?' | ':''}${previous} | Regression 2026-10-28; latest evidence per request, not a single simultaneous run.`;
    row.Status=matches.some((r)=>r.outcome==='FAIL')?'FAIL':matches.some((r)=>r.status==='SKIPPED')?'BLOCKED':'PASS';
    row.Actual_Result=matches.map((r)=>`Request ${r.id}: HTTP ${r.status}, ${r.outcome}; ${r.assertionErrors?.join('; ')||'response assertions matched'}${r.businessMessage?`; ${r.businessMessage}`:''}`).join(' | ');
    row.Source_Evidence=[...new Set([...row.Source_Evidence.split('; '),...matches.map((r)=>r.evidenceSource)])].join('; ');
  } else if(row.Test_Cycle==='MASTER-COVERAGE-2026-10-28') {
    row.Status=row.Environment.startsWith('Staging')?'BLOCKED - STAGING REQUIRED':'NOT RUN';
    const reason=row.Environment.startsWith('Staging')?'Requires controlled staging settings/data; production configuration was not changed.'
      : /money|moves/i.test(row.Environment)?'Requires a dedicated funded player and wallet-moving execution; excluded from this regression.'
        : /another|second|two player|player B|blocked|expired/i.test(row.Scenario)?'Requires additional account/token/data prerequisites or a separate stateful workflow.'
          :'Not automated in this cycle; scenario-specific data, boundary variants or postconditions still require execution. Endpoint smoke checks do not prove this entire case.';
    row.Actual_Result=reason;
  }
  if(row.Test_Cycle==='MASTER-COVERAGE-2026-10-28'||row.Test_Case_ID.startsWith('NEW-'))coverage.push({id:row.Test_Case_ID,status:row.Status,reason:row.Actual_Result});
}
sheet.getRange(`A1:L${master.length+1}`).values=[headers,...master.map((row)=>headers.map((key)=>row[key]))];
workbook.recalculate();
const verified=sheet.getUsedRange().values;
if(verified.length!==660||new Set(master.map((row)=>row.Test_Case_ID)).size!==659)throw new Error('Master row count or unique ID check failed.');
fs.writeFileSync(masterPath,verified.map((row)=>row.map((v)=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n')+'\r\n');
fs.writeFileSync(`${root}/final-execution-report.json`,JSON.stringify(results,null,2)+'\n');
const summary=await generateReport(`${root}/final-execution-report.json`,`${root}/final-execution-report.pdf`,`${collection.info.name} - consolidated regression, latest evidence per request`);
const comparison=JSON.parse(fs.readFileSync(`${root}/suite-comparison.json`));
comparison.mergedRequests=requests.length;
fs.writeFileSync(`${root}/suite-comparison.json`,JSON.stringify(comparison,null,2)+'\n');
const coverageCounts=coverage.reduce((counts,row)=>(counts[row.status]=(counts[row.status]||0)+1,counts),{});
fs.writeFileSync(`${root}/coverage-and-blockers.json`,JSON.stringify({masterRows:master.length,collectionRequests:requests.length,runs,summary,coverageCounts,cases:coverage},null,2)+'\n');
const failures=results.filter((r)=>r.outcome==='FAIL');
const lines=[
 '# Regression report — 28 October 2026', '',
 `Target: https://api.rcbmatka.com and https://payment.rcbmatka.com. All executions used the configured test player. TLS verification remained enabled using the Windows trusted certificate store.`, '',
 '## Result', '',
 `Latest evidence across the full retest and focused contract retest: **${summary.total} requests, ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped**. This is a consolidated result, not a new single full-suite run. The production regression is not fully green.`, '',
 '| Run | Requests | Passed | Failed |','| --- | ---: | ---: | ---: |',
 ...runs.map((run)=>`| ${run.source} | ${run.total} | ${run.passed} | ${run.failed} |`), '',
 '## Master-suite comparison', '',
 `The current master had ${comparison.oldRows} rows; the supplied master had ${comparison.incomingRows}. Comparison used stable Test_Case_ID values and all 12 columns, not endpoint alone. ${comparison.added.length} cases were missing and were added. ${comparison.corrected.length} existing rows had source changes: 21 expected-result updates, 24 status updates and 91 remarks updates (these overlap). Prior values are retained in suite-comparison.json and relevant master remarks. No old-only case was discarded.`, '',
 `The 22 new checklist scenarios were also added, producing **659 unique master cases** in the sole canonical file: [APK_API_master_Testcase_suite.csv](../APK_API_master_Testcase_suite.csv). Historical test cycles remain labelled; historical passes are not represented as newly rerun cases.`, '',
 `The merged Postman collection has ${requests.length} requests: original IDs 1–111 preserved, checklist IDs 112–133, and 64 additional probes at 134–197 for 12 master cases. These include all 38 unauthenticated session-middleware routes and all 7 routes that check sessions themselves. Multi-request cases pass only if every implemented variant passes.`, '',
 '## Open regression finding', '',
 ...failures.map((r)=>`- **REG-229-001 — ${r.name} (request ${r.id})**. HTTP ${r.status}. Failed checks: ${r.assertionErrors.join('; ')}. Expected duplicate_order / duplicate and the title “Payment could not be started”, with the repeat-payment explanation. Reproduced in both full runs. See the sanitized response in retest/api-execution-report.json. The HTML did not contain the required duplicate-refusal explanation. This records an observed response-contract failure; whether a second PG order was created is not established without server/payment records.`), '',
 '## Verified new behaviour', '',
 '- Favourites: list/count messages, add, duplicate add, insertion order, invalid requests, no-session refusal, remove, duplicate remove, sync filtering, and cleanup. The complete original favourites list was restored in both full runs.',
 '- Main-market, Starline and Jackpot declaration timestamps were checked against their result states for every returned market.',
 '- Add Funds: inline SVG QR, entered amount, QR/UPI controls, gateway verdict/reference, and a matching pending deposit passed. P2 (gateway unavailable) was unit-tested but not observed live because the PG returned ok. P3 duplicate handling remains failed.',
 '- Two full payment flows were executed, starting two unpaid orders. No payment was completed, no bet was placed and no withdrawal was requested. Unpaid pending records were retained as evidence.', '',
 '## Framework corrections made during regression', '',
 '- Current master expectations supersede old snapshots: settings expose only the documented app fields; withdrawal limits are numeric; payment channels omit bank/staff details; removed routes return JSON 404.',
 '- Fixed explicit assertion overrides retaining stale inferred schemas, corrected the profile’s top-level bonus/withdrawal fields, authenticated getway-list, and removed database version metadata from inferred required fields. Bid-history checks use documented history fields rather than treating a win-only field as required on pending rows.',
 '- Added explicit ports of the 22 supplied Postman tests, prerequisite handling, runtime variable capture, and write guards for GET payment requests. Original supplied Postman test scripts remain in the merged collection.', '',
 '## Remaining coverage and blockers', '',
 `The 286 new master cases plus 22 checklist cases have these current dispositions: ${Object.entries(coverageCounts).map(([status,count])=>`${status}: ${count}`).join('; ')}. A successful endpoint smoke test is not counted as execution of every boundary or state variant in the master.`, '',
 'Cases needing staging include rate-limit lockouts, blocked/deleted players, geo/IP configuration, staff-controlled settlement and restricted data states. Other unrun cases need additional accounts, genuine expired tokens, specific existing deposits, or stateful workflows. Wallet-moving bids/withdrawals and credential changes were excluded. See coverage-and-blockers.json and the master Actual_Result column for case-by-case disposition. No unexecuted case is marked passed.', '',
 '## Evidence and rerun', '',
 '- final-execution-report.json / .pdf: latest response evidence for all 149 selected requests.',
 '- api-execution-report.json / .pdf: untouched first run; retest/: second full run; contract-retest/: 11 focused probes.',
 '- suite-comparison.json: added IDs and exact before/after field corrections.',
 '- coverage-and-blockers.json: all 308 new-case dispositions and run summaries.',
 '', '```powershell', "$env:NODE_USE_SYSTEM_CA='1'", 'npm run test:framework', 'npm run test:regression -- --dry-run', 'npm run test:regression -- --allow-writes --output-dir reports/<new-cycle>', '```', '',
 'A write-enabled regression changes the test player’s favourites temporarily, replaces their login session, and starts an unpaid payment order. Use a new output directory to preserve prior execution evidence. The ordinary read-only guard remains available; staging-only and wallet-moving cases require their prerequisites before separate execution.', ''
];
fs.writeFileSync(`${root}/REGRESSION_REPORT.md`,lines.join('\n'));
fs.writeFileSync(`${root}/OPEN_FINDINGS.md`,[
  '# Open regression finding — REG-229-001','',
  '**Status:** Open; reproduced twice. **Area:** Add Funds duplicate-order response.','',
  '1. Sign in as the configured test player and get their user_id (collection requests 112 and 130).',
  '2. Open the Add Funds payment page using request 131. Confirm the gateway starts the order and request 132 finds a pending PG deposit.',
  '3. Reopen the exact same URL with the same order ID using request 133. Do not pay the order.','',
  '**Expected:** HTTP 200, X-Payin-Result=duplicate_order, X-Payin-Reason=duplicate; heading “Payment could not be started”; the documented repeat-order explanation, reference, home navigation and no WhatsApp button.','',
  `**Observed:** HTTP 200; heading “${(failures[0]?.response.match(/<h1[^>]*>([^<]*)<\/h1>/)||[])[1]||'see response evidence'}”. Four contract checks failed: duplicate verdict, reason, title and explanation. The repeat-order explanation is absent. Actual response headers were evaluated in memory but were not captured in the first two reports; future runs capture the three X-Payin headers.`, '',
  '**Evidence:** request 133 in api-execution-report.json and retest/api-execution-report.json. Both original full-run responses are preserved. The consolidated final-execution-report.json/.pdf contains the latest response.','',
  '**Impact established:** The repeat-order page does not give the required duplicate refusal. No duplicate charge or second PG order has been demonstrated. Check payment-service logs and order records before concluding that order creation itself is duplicated.','',
  '**Retest:** Replay the 22 new-feature scenarios with a dedicated test player and a fresh output directory after the service fix. This starts one unpaid order; no payment is needed.',''
].join('\n'));
console.log(JSON.stringify({summary,coverageCounts,masterRows:master.length,requests:requests.length}));
