const fs = require('node:fs');
const path = require('node:path');
const { documentedBusinessContract, evaluateBusinessContract } = require('./api-contracts');
const { assertionContract, evaluateAssertions } = require('./api-assertions');
const { prepareNewFeature, evaluateNewFeature } = require('./new-feature-contracts');

let activeRuntime;

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${label} at "${filePath}": ${error.message}`);
  }
}

function getRuntime() {
  if (!activeRuntime) {
    activeRuntime = new ApiRuntime();
  }
  return activeRuntime;
}

class ApiRuntime {
  constructor() {
    this.collectionPath = path.resolve(process.env.API_COLLECTION_FILE || 'player-app-api.postman_collection.json');
    this.environmentPath = path.resolve(process.env.API_ENV_FILE || 'rcb-matka-live.postman_environment.json');
    this.collection = readJson(this.collectionPath, 'Postman collection');
    const environment = readJson(this.environmentPath, 'Postman environment');

    this.environment = new Map((environment.values || [])
      .filter((entry) => entry.enabled !== false)
      .map((entry) => [entry.key, String(entry.value ?? '')]));
    this.collectionVariables = new Map((this.collection.variable || [])
      .map((entry) => [entry.key, String(entry.value ?? '')]));
    this.allowWrites = process.env.API_ALLOW_WRITES === 'true';
    this.requestDelay = Number(process.env.API_REQUEST_DELAY_MS || 150);
    this.lastRequestAt = 0;
    this.requests = [];
    this.collectRequests(this.collection.item || [], []);

    if (this.allowWrites && this.environment.get('allow_writes') !== 'true') {
      throw new Error('The Postman environment must set allow_writes to "true" for an authorized write-enabled run.');
    }
  }

  collectRequests(items, folders) {
    for (const item of items) {
      const itemFolders = item.item ? [...folders, item.name] : folders;
      if (item.item) {
        this.collectRequests(item.item, itemFolders);
        continue;
      }

      const request = item.request;
      if (!request) {
        continue;
      }
      this.requests.push({
        id: this.requests.length + 1,
        item,
        request,
        folders: itemFolders,
        name: item.name || `Request ${this.requests.length + 1}`,
        expectedStatus: this.expectedStatus(item),
        assertionContract: assertionContract(item),
        businessContract: item['x-qa-checklist'] || item['x-assertions']?.kind === 'explicit'
          ? null : documentedBusinessContract(request.method, this.rawUrl(request))
      });
    }
  }

  expectedStatus(item) {
    for (const event of item.event || []) {
      if (event.listen !== 'test') {
        continue;
      }
      const script = (event.script?.exec || []).join('\n');
      const match = script.match(/pm\.response\.to\.have\.status\(\s*(\d+)\s*\)/);
      if (match) {
        return Number(match[1]);
      }
    }
    return 200;
  }

  rawUrl(request) {
    return typeof request.url === 'string' ? request.url : request.url?.raw || '';
  }

  variable(name) {
    if (this.collectionVariables.has(name) && this.collectionVariables.get(name) !== '') {
      return this.collectionVariables.get(name);
    }
    return this.environment.get(name) || '';
  }

  replaceVariables(value) {
    return String(value ?? '').replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_match, name) => this.variable(name));
  }

  resolveUrl(request) {
    const url = request.url;
    let raw = typeof url === 'string' ? url : url?.raw || '';
    if (url && typeof url === 'object') {
      for (const variable of url.variable || []) {
        raw = raw.replace(new RegExp(`:${escapeRegExp(variable.key)}(?=/|\\?|$)`, 'g'), this.replaceVariables(variable.value));
      }
    }
    return this.replaceVariables(raw);
  }

  headersFor(request) {
    const headers = new Headers();
    for (const header of request.header || []) {
      if (!header.disabled && header.key) {
        headers.set(header.key, this.replaceVariables(header.value));
      }
    }

    const auth = request.auth && request.auth.type !== 'inherit'
      ? request.auth
      : this.collection.auth;
    if (auth?.type === 'bearer') {
      const token = (auth.bearer || []).find((entry) => entry.key === 'token')?.value;
      const resolvedToken = this.replaceVariables(token);
      if (resolvedToken) {
        headers.set('Authorization', `Bearer ${resolvedToken}`);
      }
    } else if (auth?.type === 'apikey') {
      const key = (auth.apikey || []).find((entry) => entry.key === 'key')?.value;
      const value = this.replaceVariables((auth.apikey || []).find((entry) => entry.key === 'value')?.value);
      const location = (auth.apikey || []).find((entry) => entry.key === 'in')?.value;
      if (key && value && location === 'header') {
        headers.set(key, value);
      }
    }
    return headers;
  }

  async bodyFor(request, headers) {
    const body = request.body;
    if (!body || body.disabled) {
      return undefined;
    }
    if (body.mode === 'raw') {
      return this.replaceVariables(body.raw || '');
    }
    if (body.mode === 'urlencoded') {
      const params = new URLSearchParams();
      for (const entry of body.urlencoded || []) {
        if (!entry.disabled) {
          params.append(entry.key, this.replaceVariables(entry.value));
        }
      }
      if (!headers.has('content-type')) {
        headers.set('Content-Type', 'application/x-www-form-urlencoded');
      }
      return params.toString();
    }
    if (body.mode === 'formdata') {
      const form = new FormData();
      for (const entry of body.formdata || []) {
        if (entry.disabled) {
          continue;
        }
        if (entry.type === 'file' && entry.src) {
          const filePath = path.resolve(entry.src);
          if (!fs.existsSync(filePath)) {
            throw new Error(`Form-data file not found: ${filePath}`);
          }
          const bytes = fs.readFileSync(filePath);
          form.append(entry.key, new Blob([bytes]), path.basename(filePath));
        } else {
          form.append(entry.key, this.replaceVariables(entry.value));
        }
      }
      headers.delete('content-type');
      return form;
    }
    return undefined;
  }

  requestIsWriteGuarded(item) {
    return (item.event || []).some((event) => event.listen === 'prerequest'
      && (event.script?.exec || []).join('\n').includes("pm.environment.get('allow_writes')"));
  }

  saveResponseVariables(item, responseBody) {
    let json;
    try {
      json = JSON.parse(responseBody);
    } catch {
      return;
    }

    for (const event of item.event || []) {
      if (event.listen !== 'test') {
        continue;
      }
      const script = (event.script?.exec || []).join('\n');
      const match = script.match(/^\s*(\[\[.*\]\])\s*\.forEach\s*\(\s*function\s*\(s\)/m);
      if (!match) {
        continue;
      }
      let mappings;
      try {
        mappings = JSON.parse(match[1]);
      } catch {
        continue;
      }
      for (const [key, selector, destination] of mappings) {
        const value = pick(json, selector);
        if (value === undefined || value === null || value === '') {
          continue;
        }
        const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (destination === 'environment') {
          this.environment.set(key, serialized);
        } else {
          this.collectionVariables.set(key, serialized);
        }
      }
    }
  }

  async execute(requestId) {
    const configured = this.requests[requestId - 1];
    if (!configured || configured.id !== requestId) {
      throw new Error(`Postman request ID ${requestId} does not exist.`);
    }

    const { item, request, expectedStatus } = configured;
    const method = String(request.method || 'GET').toUpperCase();
    const checklistSkip = prepareNewFeature(item, this);
    if (checklistSkip) return {
      id: requestId, name: configured.name, method, url: safeUrl(this.resolveUrl(request)),
      status: 'SKIPPED', expectedStatus, response: `Not sent: ${checklistSkip}`, durationMs: 0
    };
    const missingPathVariables = (request.url?.variable || [])
      .filter((entry) => this.replaceVariables(entry.value) === '')
      .map((entry) => entry.key);
    if (missingPathVariables.length > 0) {
      return {
        id: requestId,
        name: configured.name,
        folder: configured.folders.join(' / '),
        method,
        url: safeUrl(this.resolveUrl(request)),
        status: 'SKIPPED',
        expectedStatus,
        response: `Not sent: missing required path variable(s): ${missingPathVariables.join(', ')}.`,
        durationMs: 0
      };
    }
    const auth = request.auth && request.auth.type !== 'inherit' ? request.auth : this.collection.auth;
    const bearer = (auth?.type === 'bearer' ? auth.bearer || [] : [])
      .find((entry) => entry.key === 'token')?.value;
    if (bearer && !this.replaceVariables(bearer)) {
      return {
        id: requestId,
        name: configured.name,
        folder: configured.folders.join(' / '),
        method,
        url: safeUrl(this.resolveUrl(request)),
        status: 'SKIPPED',
        expectedStatus,
        response: 'Not sent: the required bearer token has not been populated by an earlier request.',
        durationMs: 0
      };
    }
    const writeGuarded = item['x-write-guarded'] || this.requestIsWriteGuarded(item);
    if (!this.allowWrites && (writeGuarded || !['GET', 'HEAD', 'OPTIONS'].includes(method))) {
      return {
        id: requestId,
        name: configured.name,
        method,
        url: safeUrl(this.resolveUrl(request)),
        status: 'SKIPPED',
        expectedStatus,
        response: 'Not sent: this request may change server state. Re-run with --allow-writes to authorize mutations.',
        durationMs: 0
      };
    }

    const url = this.resolveUrl(request);
    const headers = this.headersFor(request);
    let body;
    try {
      body = await this.bodyFor(request, headers);
      if (method === 'GET' || method === 'HEAD') {
        body = undefined;
      }
      if (!url || /\{\{[^}]+\}\}/.test(url)) {
        throw new Error('The request URL is missing a required Postman variable.');
      }
      const now = Date.now();
      const wait = Math.max(0, this.requestDelay - (now - this.lastRequestAt));
      if (wait) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      this.lastRequestAt = Date.now();
      const startedAt = Date.now();
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(Number(process.env.API_TIMEOUT_MS || 30000)),
        redirect: 'follow'
      });
      const responseBytes = Buffer.from(await response.arrayBuffer());
      const responseText = response.headers.get('content-type')?.includes('text')
        || response.headers.get('content-type')?.includes('json')
        || response.headers.get('content-type')?.includes('xml')
        ? responseBytes.toString('utf8')
        : '';
      const responseContent = responseText
        ? redactText(responseText)
        : formatBinaryResponse(responseBytes);

      const businessCheck = evaluateBusinessContract(configured.businessContract, responseText);
      const durationMs = Date.now() - startedAt;
      const assertionInput = {
        text: responseText, bytes: responseBytes,
        contentType: response.headers.get('content-type') || '', durationMs, headers: response.headers
      };
      const assertionCheck = item['x-qa-checklist']
        ? evaluateNewFeature(item['x-qa-checklist'], assertionInput, this, item)
        : evaluateAssertions(configured.assertionContract, assertionInput, businessCheck);
      if (item['x-qa-checklist'] && durationMs > Number(process.env.API_MAX_RESPONSE_MS || 30000)) {
        assertionCheck.errors.push('Response exceeded the configured response time limit.');
        assertionCheck.status = 'FAIL';
      }
      const statusMatches = response.status === expectedStatus;
      const businessMatches = !businessCheck || businessCheck.status !== 'FAIL';
      if (statusMatches && businessMatches && assertionCheck.status === 'PASS') {
        this.saveResponseVariables(item, responseText);
      }
      return {
        id: requestId,
        name: configured.name,
        folder: configured.folders.join(' / '),
        method,
        url: safeUrl(url),
        status: response.status,
        expectedStatus,
        response: responseContent,
        contentType: response.headers.get('content-type') || '',
        ...(item['x-qa-checklist'] === 20 || item['x-qa-checklist'] === 22 ? {
          responseHeaders: Object.fromEntries(['x-payin-result','x-payin-reason','x-payin-ref'].map((key) => [key,response.headers.get(key) || '']))
        } : {}),
        durationMs,
        assertionOutcome: assertionCheck.status,
        assertionErrors: assertionCheck.errors,
        assertionCount: assertionCheck.assertions,
        expectedBusiness: configured.businessContract,
        businessOutcome: businessCheck?.status || 'NOT_ASSERTED',
        businessMessage: businessCheck?.message || '',
        actualBusinessSuccess: businessCheck?.actualSuccess,
        outcome: statusMatches && businessMatches && assertionCheck.status === 'PASS' ? 'PASS' : 'FAIL'
      };
    } catch (error) {
      return {
        id: requestId,
        name: configured.name,
        folder: configured.folders.join(' / '),
        method,
        url: safeUrl(url),
        status: 'ERROR',
        expectedStatus,
        response: redactText(error.message),
        durationMs: 0,
        outcome: 'FAIL'
      };
    }
  }
}

function pick(object, selector) {
  for (const alternative of String(selector).split('||')) {
    const segments = alternative.match(/\[[^\]]*\]|[^.]+/g) || [];
    const value = segments.reduce((current, segment) => {
      if (current == null) {
        return undefined;
      }
      const filter = segment.match(/^\[(.+?)=(.*)\]$/);
      if (filter) {
        return Array.isArray(current)
          ? current.find((entry) => entry != null && String(entry[filter[1]]) === filter[2])
          : undefined;
      }
      return current[segment];
    }, object);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function redactValue(value, key = '') {
  if (/password|token|secret|authorization|cookie|api.?key|otp|mobile|phone|email|account.*(?:number|no)|account.?holder|ifsc|fcm|(^|_)id$|order_?id|deposit_?id|transaction_?id|username|user_?name|payout_sending_by|blocked_support|last_ip|device_?id|support_contact_id|registered_by|^state$/i.test(key)) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      redactValue(childValue, childKey)
    ]));
  }
  if (typeof value === 'string') {
    return redactText(value);
  }
  return value;
}

function redactText(value) {
  try {
    return JSON.stringify(redactValue(JSON.parse(value)), null, 2);
  } catch {
    return String(value)
      .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED]')
      .replace(/\b\d{10,18}\b/g, '[REDACTED]');
  }
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    for (const [key] of url.searchParams) {
      if (/token|key|secret|password|mobile|phone|account|otp|order|transaction|deposit/i.test(key)) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return String(value).split('?')[0];
  }
}

function formatBinaryResponse(bytes) {
  const hash = require('node:crypto').createHash('sha256').update(bytes).digest('hex');
  return `[Non-text response: ${bytes.length} bytes; SHA-256 ${hash}; Base64: ${bytes.toString('base64')}]`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { ApiRuntime, getRuntime, redactText, formatBinaryResponse };
