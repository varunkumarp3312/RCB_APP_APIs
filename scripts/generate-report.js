const fs = require('node:fs');
const path = require('node:path');

function toAscii(value) {
  return String(value ?? '')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\r/g, '');
}

function generateReport(jsonPath, pdfPath, collectionName) {
  const PDFDocument = require('pdfkit');
  const results = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : [];
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  const doc = new PDFDocument({ autoFirstPage: true, margin: 48, size: 'A4' });
  const output = fs.createWriteStream(pdfPath);
  doc.pipe(output);

  const passed = results.filter((result) => result.outcome === 'PASS').length;
  const failed = results.filter((result) => result.outcome === 'FAIL').length;
  const skipped = results.filter((result) => result.status === 'SKIPPED').length;
  const configurationWarnings = results.filter((result) => result.businessOutcome === 'CONFIGURATION').length;
  const documentedRefusals = results.filter((result) => result.expectedBusiness?.expectedSuccess !== undefined
    && result.expectedBusiness.expectedSuccess !== '1'
    && result.businessOutcome === 'PASS').length;
  const unsuccessfulResults = new Set(results.filter((result) => hasUnsuccessfulSuccessFlag(result.response)));
  const unsuccessfulFlags = unsuccessfulResults.size;
  doc.font('Helvetica-Bold').fontSize(18).text('API Test Execution Report');
  doc.moveDown(0.4).font('Helvetica').fontSize(10);
  doc.text(`Collection: ${toAscii(collectionName)}`);
  doc.text(`Executed: ${new Date().toISOString()}`);
  doc.text(`Requests: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  doc.text(`Documented refusals matched: ${documentedRefusals} | Configuration warnings: ${configurationWarnings}`);
  doc.text(`Responses with success=false/0: ${unsuccessfulFlags} (includes documented refusals).`);
  doc.moveDown();
  doc.fontSize(9).text('Sensitive response fields (credentials, tokens, contact and bank details) are redacted.');

  for (const result of results) {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(12).text(`${String(result.id).padStart(3, '0')} - ${toAscii(result.name)}`);
    doc.moveDown(0.3).font('Helvetica').fontSize(9);
    doc.text(`Folder: ${toAscii(result.folder || '(root)')}`);
    doc.text(`Request: ${result.method} ${toAscii(result.url)}`);
    doc.text(`Result: ${result.outcome || result.status} | HTTP: ${result.status} | Expected: ${result.expectedStatus}`);
    if (result.expectedBusiness?.name) {
      doc.text(`Business contract: ${toAscii(result.expectedBusiness.name)} | ${toAscii(result.businessOutcome)}`);
    }
    if (result.businessMessage) {
      doc.text(`Business detail: ${toAscii(result.businessMessage)}`);
    }
    if (result.assertionOutcome) {
      doc.text(`Response assertions: ${result.assertionOutcome}`);
      for (const error of result.assertionErrors || []) doc.text(toAscii(error));
    }
    for (const [key, value] of Object.entries(result.responseHeaders || {})) doc.text(`${key}: ${toAscii(value)}`);
    if (unsuccessfulResults.has(result)) {
      doc.text('Business indicator: success=false/0 (informational; not asserted by the Postman collection).');
    }
    doc.text(`Duration: ${result.durationMs || 0} ms${result.contentType ? ` | Content-Type: ${toAscii(result.contentType)}` : ''}`);
    doc.moveDown(0.5).font('Helvetica-Bold').text('Response');
    doc.moveDown(0.2).font('Courier').fontSize(7).text(toAscii(result.response || '(empty response)'), {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      lineGap: 1,
      paragraphGap: 2
    });
    doc.font('Helvetica').fontSize(9);
  }

  doc.end();
  return new Promise((resolve, reject) => {
    output.on('finish', () => resolve({
      passed,
      failed,
      skipped,
      configurationWarnings,
      documentedRefusals,
      unsuccessfulFlags,
      total: results.length
    }));
    output.on('error', reject);
  });
}

function hasUnsuccessfulSuccessFlag(response) {
  let parsed;
  try {
    parsed = JSON.parse(response);
  } catch {
    return false;
  }

  function search(value) {
    if (Array.isArray(value)) {
      return value.some(search);
    }
    if (!value || typeof value !== 'object') {
      return false;
    }
    return Object.entries(value).some(([key, child]) => (
      (key.toLowerCase() === 'success'
        && (child === false || child === 0 || child === '0' || String(child).toLowerCase() === 'false'))
      || search(child)
    ));
  }

  return search(parsed);
}

module.exports = { generateReport, hasUnsuccessfulSuccessFlag };
