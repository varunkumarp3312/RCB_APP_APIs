const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { generateReport } = require('./generate-report');
const { APP_USED_ROUTES, routeKey } = require('./api-contracts');

function parseArguments(args) {
  const options = { allowWrites: false, dryRun: false, ids: null, suite: 'all' };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--allow-writes') {
      options.allowWrites = true;
    } else if (args[index] === '--dry-run') {
      options.dryRun = true;
    } else if (args[index] === '--ids') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('--ids requires a comma-separated list of positive request numbers.');
      }
      options.ids = value.split(',').map((entry) => Number(entry.trim()));
      if (options.ids.some((value) => !Number.isInteger(value) || value < 1)) {
        throw new Error('--ids must be a comma-separated list of positive request numbers.');
      }
      index += 1;
    } else if (args[index] === '--suite') {
      options.suite = args[index + 1];
      if (!['all', 'app', 'legacy'].includes(options.suite)) {
        throw new Error('--suite must be one of: all, app, legacy.');
      }
      index += 1;
    } else if (['--collection', '--environment', '--output-dir'].includes(args[index])) {
      options[{
        '--collection': 'collection',
        '--environment': 'environment',
        '--output-dir': 'outputDir'
      }[args[index]]] = args[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${args[index]}`);
    }
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const collectionPath = path.resolve(options.collection || 'player-app-api.postman_collection.json');
  const environmentPath = path.resolve(options.environment || 'rcb-matka-live.postman_environment.json');
  const outputDir = path.resolve(options.outputDir || 'reports');
  const resultsPath = path.join(outputDir, 'api-execution-report.json');
  const pdfPath = path.join(outputDir, 'api-execution-report.pdf');

  if (!fs.existsSync(collectionPath)) {
    throw new Error(`Postman collection not found: ${collectionPath}`);
  }
  if (!fs.existsSync(environmentPath)) {
    throw new Error(`Postman environment not found: ${environmentPath}`);
  }
  const environment = JSON.parse(fs.readFileSync(environmentPath, 'utf8'));
  const allowWrites = (environment.values || []).find((entry) => entry.key === 'allow_writes')?.value;
  if (options.allowWrites && !options.dryRun && String(allowWrites) !== 'true') {
    throw new Error('Execution stopped: the selected Postman environment must have allow_writes set to "true".');
  }

  const featureDir = path.resolve('features');
  const featurePath = path.join(featureDir, 'generated-api.feature');
  fs.mkdirSync(featureDir, { recursive: true });
  const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
  const requests = [];
  collectRequests(collection.item || [], requests);
  const requestNames = requests.map((request) => request.name);
  const suiteIds = requests
    .filter((request) => {
      const isAppUsed = APP_USED_ROUTES.has(routeKey(request.method, request.url));
      return options.suite === 'all' || (options.suite === 'app' ? isAppUsed : !isAppUsed);
    })
    .map((request) => request.id);
  const selectedIds = options.ids || suiteIds;
  if (selectedIds.some((id) => id > requestNames.length)) {
    throw new Error(`Request ID must be between 1 and ${requestNames.length}.`);
  }
  if (selectedIds.some((id) => !suiteIds.includes(id))) {
    throw new Error(`A requested ID is not part of the selected "${options.suite}" suite.`);
  }
  if (new Set(selectedIds).size !== selectedIds.length) {
    throw new Error('--ids cannot contain duplicate request numbers.');
  }
  const previousResults = options.ids && fs.existsSync(resultsPath)
    ? JSON.parse(fs.readFileSync(resultsPath, 'utf8'))
    : [];
  const feature = [
    `Feature: ${safeFeatureText(collection.info?.name || 'Postman API collection')}`,
    `  Execute the ${options.suite} API suite in Postman collection order.`,
    '',
    ...selectedIds.flatMap((id) => [
      `  Scenario: Request ${String(id).padStart(3, '0')} - ${safeFeatureText(requestNames[id - 1])}`,
      `    When I execute Postman request ${id}`,
      '    Then the response status matches the collection expectation',
      '    Then the response body matches its documented business contract',
      ''
    ])
  ].join('\n');
  fs.writeFileSync(featurePath, feature, 'utf8');

  const cucumberCli = path.resolve('node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber.js');
  const cucumberArgs = [
    cucumberCli,
    featurePath,
    '--require',
    path.join(featureDir, 'support', '*.js'),
    '--format',
    'progress'
  ];
  if (options.dryRun) {
    cucumberArgs.push('--dry-run');
  } else {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.rmSync(resultsPath, { force: true });
  }
  const child = spawnSync(process.execPath, cucumberArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      API_ALLOW_WRITES: String(options.allowWrites),
      API_COLLECTION_FILE: collectionPath,
      API_ENV_FILE: environmentPath,
      API_RESULTS_FILE: resultsPath
    }
  });

  if (child.error) {
    throw child.error;
  }
  if (options.dryRun) {
    if (child.status === 0) {
        console.log(`Dry run validated ${selectedIds.length} ${options.suite} Cucumber scenarios; no API requests were sent.`);
    } else {
      console.error('Cucumber dry run failed; no API requests were sent.');
    }
    process.exitCode = child.status === 0 ? 0 : 1;
    return;
  }

  if (options.ids) {
    const updatedResults = fs.existsSync(resultsPath)
      ? JSON.parse(fs.readFileSync(resultsPath, 'utf8'))
      : [];
    const merged = new Map(previousResults.map((result) => [result.id, result]));
    for (const result of updatedResults) {
      merged.set(result.id, result);
    }
    fs.writeFileSync(resultsPath, `${JSON.stringify([...merged.values()].sort((a, b) => a.id - b.id), null, 2)}\n`, 'utf8');
  }

  const summary = await generateReport(
    resultsPath,
    pdfPath,
    collection.info?.name || path.basename(collectionPath)
  );
  console.log(`\nReport PDF: ${pdfPath}`);
  console.log(`Sanitized response data: ${resultsPath}`);
  console.log(`Requests: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed} | Skipped: ${summary.skipped}`);
  process.exitCode = child.status === 0 && summary.failed === 0 ? 0 : 1;
}

function collectRequests(items, requests) {
  for (const item of items) {
    if (item.item) {
      collectRequests(item.item, requests);
    } else if (item.request) {
      requests.push({
        id: requests.length + 1,
        name: item.name || `Request ${requests.length + 1}`,
        method: item.request.method || 'GET',
        url: typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || ''
      });
    }
  }
}

function safeFeatureText(value) {
  return String(value).replace(/[\r\n"]/g, ' ').trim();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
