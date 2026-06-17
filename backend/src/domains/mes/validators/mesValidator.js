'use strict';

/**
 * M1.1 — MES Payload Validator
 * Validação estrutural simples sem dependência externa.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function _isUuid(v) { return UUID_RE.test(String(v || '')); }
function _isString(v, min = 1, max = 256) {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}
function _isNumber(v, min, max) {
  if (typeof v !== 'number' || Number.isNaN(v)) return false;
  if (min != null && v < min) return false;
  if (max != null && v > max) return false;
  return true;
}

function validatePayload(schema, data) {
  const errors = [];
  if (!data || typeof data !== 'object') return { valid: false, errors: ['payload must be an object'] };

  for (const field of (schema.required || [])) {
    if (data[field] == null || data[field] === '') {
      errors.push(`${field} is required`);
    }
  }

  for (const [field, rules] of Object.entries(schema.properties || {})) {
    const val = data[field];
    if (val == null) continue;

    if (rules.type === 'uuid' && !_isUuid(val)) {
      errors.push(`${field} must be a valid UUID`);
    }
    if (rules.type === 'string' && !_isString(val, rules.minLength || 0, rules.maxLength || 256)) {
      errors.push(`${field} must be a string (${rules.minLength || 0}–${rules.maxLength || 256} chars)`);
    }
    if (rules.type === 'number' && !_isNumber(val, rules.minimum, rules.maximum)) {
      errors.push(`${field} must be a number${rules.minimum != null ? ` >= ${rules.minimum}` : ''}${rules.maximum != null ? ` <= ${rules.maximum}` : ''}`);
    }
    if (rules.enum && !rules.enum.includes(val)) {
      errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validatePayload };
