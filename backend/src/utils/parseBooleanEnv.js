'use strict';

/**
 * Interpreta variável de ambiente como booleano estrito: apenas "true" (case-insensitive, trim).
 * Não aceita "1", "yes", etc.
 *
 * @param {string|undefined|null} value
 * @returns {boolean}
 */
function parseBooleanEnv(value) {
  return (
    String(value || '')
      .trim()
      .toLowerCase() === 'true'
  );
}

module.exports = { parseBooleanEnv };
