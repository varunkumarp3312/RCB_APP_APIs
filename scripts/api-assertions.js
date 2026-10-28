// Saved examples establish structure, never fixed player IDs, balances or dates.
function schemaOf(value) {
  if (value === null) return { type: 'nullable' };
  if (Array.isArray(value)) return { type: 'array', items: value.length ? mergeSchemas(value.map(schemaOf)) : null };
  if (typeof value === 'object') return {
    type: 'object', properties: Object.fromEntries(Object.entries(value).filter(([key]) => key !== '__v').map(([key, child]) => [key, schemaOf(child)]))
  };
  return { type: typeof value };
}

function mergeSchemas(schemas) {
  const types = new Set(schemas.map((schema) => schema.type));
  if (types.has('nullable')) return { type: 'nullable' };
  if (types.size > 1) return { type: 'union', alternatives: schemas };
  if (schemas[0].type === 'object') return {
    type: 'object', properties: Object.fromEntries(Object.keys(schemas[0].properties)
      .filter((key) => schemas.every((schema) => Object.hasOwn(schema.properties, key)))
      .map((key) => [key, mergeSchemas(schemas.map((schema) => schema.properties[key]))]))
  };
  if (schemas[0].type === 'array') {
    const items = schemas.map((schema) => schema.items).filter(Boolean);
    return { type: 'array', items: items.length ? mergeSchemas(items) : null };
  }
  return schemas[0];
}

function assertionContract(item) {
  const example = item.response?.find((entry) => typeof entry.body === 'string');
  const overrides = item['x-assertions'] || {};
  if (overrides.kind === 'explicit') return overrides;
  let body;
  try { body = JSON.parse(example?.body); } catch { /* Text and file responses have separate checks. */ }
  if (body !== undefined) return {
    kind: 'json', schema: schemaOf(body),
    expectedSuccess: body && Object.hasOwn(body, 'success') ? body.success : undefined,
    nonEmpty: body?.token !== undefined ? ['token', 'data.id'] : [],
    ...overrides
  };
  if (/support-chat\/file\//.test(typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw)) {
    return { kind: 'image', ...overrides };
  }
  return { kind: 'text', expectedText: example?.body, ...overrides };
}

function validateShape(schema, value, path, errors) {
  if (schema.type === 'nullable') return; // A null example cannot establish the eventual value type.
  if (schema.type === 'union') {
    if (!schema.alternatives.some((candidate) => {
      const candidateErrors = [];
      validateShape(candidate, value, path, candidateErrors);
      return candidateErrors.length === 0;
    })) errors.push(`${path}: did not match an observed field type`);
    return;
  }
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (type !== schema.type) {
    errors.push(`${path}: expected ${schema.type}, received ${type}`);
    return;
  }
  if (type === 'number' && !Number.isFinite(value)) errors.push(`${path}: expected a finite number`);
  if (type === 'object') for (const [key, child] of Object.entries(schema.properties)) {
    if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: required field missing`);
    else validateShape(child, value[key], `${path}.${key}`, errors);
  }
  if (type === 'array' && schema.items) value.forEach((entry, index) => validateShape(schema.items, entry, `${path}[${index}]`, errors));
}

function evaluateAssertions(contract, { text = '', bytes = Buffer.alloc(0), contentType = '', durationMs = 0 }, businessCheck) {
  const errors = [];
  const maxResponseMs = contract.maxResponseMs ?? Number(process.env.API_MAX_RESPONSE_MS || 30000);
  if (!Number.isFinite(maxResponseMs) || maxResponseMs <= 0) errors.push('Response time limit must be a positive number');
  else if (durationMs > maxResponseMs) errors.push(`Response time exceeded ${maxResponseMs} ms`);
  if (contract.kind === 'json' || contract.kind === 'explicit') {
    if (!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(contentType)) errors.push('Expected a JSON Content-Type');
    let body;
    try { body = JSON.parse(text); } catch { errors.push('Expected valid JSON'); }
    if (body !== undefined) {
      // Documented alternative support configurations have their own shape rules.
      if (contract.schema && businessCheck?.status !== 'CONFIGURATION') validateShape(contract.schema, body, '$', errors);
      if (!businessCheck && contract.expectedSuccess !== undefined && body?.success !== contract.expectedSuccess) {
        errors.push('$.success: did not match the expected business outcome');
      }
      for (const [selector, expected] of Object.entries(contract.equals || {})) {
        const actual = selector.split('.').reduce((value, key) => value?.[key], body);
        if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`${selector}: did not match the configured expected value`);
      }
      for (const selector of contract.nonEmpty || []) {
        const actual = selector.split('.').reduce((value, key) => value?.[key], body);
        if (typeof actual !== 'string' || !actual.trim()) errors.push(`${selector}: expected a non-empty string`);
      }
      for (const selector of contract.absent || []) {
        const actual = selector.split('.').reduce((value, key) => value?.[key], body);
        if (actual !== undefined) errors.push(`${selector}: expected field to be absent`);
      }
      for (const [selector, keys] of Object.entries(contract.exactKeys || {})) {
        const actual = selector.split('.').reduce((value, key) => value?.[key], body);
        if (!actual || typeof actual !== 'object' || JSON.stringify(Object.keys(actual).sort()) !== JSON.stringify([...keys].sort())) {
          errors.push(`${selector}: expected only the documented fields`);
        }
      }
    }
  } else if (contract.kind === 'image') {
    if (!/^image\//i.test(contentType)) errors.push('Expected an image Content-Type');
    if (!bytes.length) errors.push('Expected a non-empty image body');
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const gif = /^GIF8[79]a/.test(bytes.subarray(0, 6).toString('ascii'));
    const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    if (!(png || jpeg || gif || webp)) errors.push('Expected PNG, JPEG, GIF or WebP image bytes');
  } else if (contract.expectedText === undefined) errors.push('Missing saved response example or explicit assertion contract');
  else if (text.trim() !== contract.expectedText.trim()) errors.push('Text response did not match the saved contract');
  return { status: errors.length ? 'FAIL' : 'PASS', errors };
}

module.exports = { assertionContract, evaluateAssertions };
