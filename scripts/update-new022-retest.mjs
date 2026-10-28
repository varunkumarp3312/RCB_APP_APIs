import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'));
const {Workbook}=require('@oai/artifact-tool');
const file='reports/APK_API_master_Testcase_suite.csv';
const folder='reports/regression-2026-10-28-v229/new022-600-retest';
const [result]=JSON.parse(fs.readFileSync(`${folder}/api-execution-report.json`));
const book=await Workbook.fromCSV(fs.readFileSync(file,'utf8'),{sheetName:'Master'});
const sheet=book.worksheets.getItemAt(0);
const rows=sheet.getUsedRange().values;
const headers=rows[0];const index=(key)=>headers.indexOf(key);
const targets=rows.filter((row)=>row[index('Test_Case_ID')]==='NEW-022');
if(targets.length!==1)throw new Error('Expected exactly one NEW-022 master row');
const row=targets[0];
if(!String(row[index('Remarks')]).includes('Revised per user request'))row[index('Remarks')]+=` | Prior scope/result: ${row[index('Expected_Result')]} / ${row[index('Status')]}. Revised per user request: unique order, INR 600, HTTP 200 only; original duplicate response issue not verified as fixed.`;
row[index('Scenario')]='NEW-022 — Open payment page with a fresh unique order ID and amount INR 600; validate HTTP 200 only.';
row[index('Expected_Result')]='HTTP 200 for a fresh unique order ID and amount 600. Payment completion, PG success and duplicate-order behaviour are outside this check.';
row[index('Actual_Result')]=`HTTP ${result.status}; ${result.outcome}; amount INR 600; fresh order ${result.orderId}. Payment completion was not tested. Only login/profile prerequisites and this payment request executed.`;
row[index('Status')]=result.outcome;
row[index('Source_Evidence')]+=`; ${folder}/api-execution-report.json`;
sheet.getRange(`A1:L${rows.length}`).values=rows;
book.recalculate();
const final=sheet.getUsedRange().values;
if(final.length!==rows.length)throw new Error('Row count changed');
let masterUpdated=false;
try {
 fs.writeFileSync(file,final.map((r)=>r.map((v)=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n')+'\r\n');
 masterUpdated=true;
} catch(error) {
 if(error.code!=='EBUSY')throw error;
 console.log('Master CSV is locked; retest evidence and documentation are saved. Rerun this updater after the CSV is closed.');
}
const note=`\n\n## NEW-022 revised-scope retest\n\nPer the user’s revised requirement, NEW-022 now uses a fresh unique order ID and amount INR 600, with HTTP 200 as its pass condition. The isolated retest returned HTTP ${result.status}: **${result.outcome}**. Order ID: ${result.orderId}. Only the login/profile prerequisites and NEW-022 were executed. Payment completion and PG success were not asserted.\n\nEvidence: new022-600-retest/api-execution-report.json and .pdf. The master suite reflects this revised scope. Earlier consolidated totals remain historical results under the original duplicate-order assertions. REG-229-001 was not retested under its original criteria and is not established as fixed.\n`;
for(const name of ['REGRESSION_REPORT.md','OPEN_FINDINGS.md']){
 const p=`reports/regression-2026-10-28-v229/${name}`;
 const original=fs.readFileSync(p,'utf8').split('\n\n## NEW-022 revised-scope retest')[0];
 fs.writeFileSync(p,original+(masterUpdated?note:note.replace('The master suite reflects this revised scope.','The master CSV is locked by another application; its NEW-022 row update is pending.')));
}
fs.writeFileSync(`${folder}/RETEST_SUMMARY.md`,`# NEW-022 retest\n\nCycle: QA-2.29-REGRESSION-2026-10-28\n\n- Result: ${result.outcome}; HTTP ${result.status}.\n- Amount: INR 600.\n- Fresh order: ${result.orderId}.\n- Scope: HTTP 200 only; no completed-payment claim.\n- Executed: NEW-022 (request 133), with login (112) and profile (130) prerequisites only.\n- Earlier duplicate-order failure: retained; not verified as fixed by this revised test.\n`);
console.log(masterUpdated?'Updated only NEW-022 in the canonical master; retained historical results.':'Master update pending file unlock; all retest evidence saved.');
