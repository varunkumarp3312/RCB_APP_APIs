const fs = require('node:fs');
const path = require('node:path');
const { After } = require('@cucumber/cucumber');

const resultPath = path.resolve(process.env.API_RESULTS_FILE || 'reports/api-execution-report.json');
const results = [];

After(function () {
  if (!this.requestResult) {
    return;
  }

  results.push(this.requestResult);
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
});
