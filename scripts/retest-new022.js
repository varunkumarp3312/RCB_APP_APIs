const fs = require('node:fs');
const { ApiRuntime } = require('./api-runtime');
const { generateReport } = require('./generate-report');
async function main() {
  const output = 'reports/regression-2026-10-28-v229/new022-600-retest';
  fs.mkdirSync(output, { recursive: true });
  const runtime = new ApiRuntime();
  if (!runtime.allowWrites) throw new Error('Set API_ALLOW_WRITES=true for this authorized unpaid-order retest.');
  const prerequisites = [];
  for (const id of [112, 130]) {
    const result = await runtime.execute(id);
    prerequisites.push(result);
    fs.writeFileSync(`${output}/prerequisites.json`, JSON.stringify(prerequisites,null,2)+'\n');
    if (result.outcome !== 'PASS') throw new Error(`Prerequisite ${id} failed; NEW-022 was not sent.`);
  }
  const result = await runtime.execute(133);
  result.testCaseId = 'NEW-022';
  result.amount = 600;
  result.orderId = runtime.variable('order_id');
  result.validationScope = 'Fresh unique order; HTTP 200 only. Payment completion, gateway success and duplicate handling are not asserted.';
  fs.writeFileSync(`${output}/api-execution-report.json`, JSON.stringify([result],null,2)+'\n');
  await generateReport(`${output}/api-execution-report.json`,`${output}/api-execution-report.pdf`,'NEW-022 - unique order, INR 600, HTTP response only');
  console.log(JSON.stringify({testCaseId:'NEW-022',status:result.status,outcome:result.outcome,amount:600,orderId:result.orderId,output}));
  if(result.outcome!=='PASS')process.exitCode=1;
}
main().catch((error)=>{console.error(error.message);process.exitCode=1;});
