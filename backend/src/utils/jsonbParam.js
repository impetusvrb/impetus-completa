'use strict';

/**
 * Serializa valores para parâmetros PostgreSQL JSON/JSONB.
 * node-pg envia arrays JS como literal PG `{a,b}` — inválido para colunas jsonb.
 * Sempre produz string JSON válida ou null.
 */

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * @param {*} value
 * @param {[]|{}} [emptyFallback=[]]
 * @returns {string|null}
 */
function serializeJsonbParam(value, emptyFallback = []) {
  if (value === undefined || value === null) {
    return JSON.stringify(emptyFallback);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return JSON.stringify(emptyFallback);
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      throw new Error(`Valor string inválido para coluna JSONB: ${trimmed.slice(0, 80)}`);
    }
  }

  if (Array.isArray(value) || isPlainObject(value)) {
    return JSON.stringify(value);
  }

  return JSON.stringify(emptyFallback);
}

module.exports = {
  serializeJsonbParam
};
