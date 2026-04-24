'use strict';

/**
 * Heurísticas leves para possível vazamento de segredos em strings de log.
 * Falsos positivos são esperados — serve para alerta, não para bloqueio.
 */

const JWT_LIKE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;
const BEARER = /Bearer\s+[A-Za-z0-9\-._~+/]{20,}={0,2}/i;
const CPF_FORMATTED = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
const EMAIL = /\b[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}@[A-Za-z0-9][A-Za-z0-9.-]{0,251}\.[A-Za-z]{2,63}\b/;
/** Bloco base64 “longo” (≥48 caracteres úteis), palavra isolada. */
const LONG_B64 = /\b(?:[A-Za-z0-9+/]{4}){12,}(?:={0,2})\b/;
/** Atribuições estilo credencial em texto plano. */
const SENSITIVE_ASSIGN = /\b(password|token|secret)\b\s*[:=]\s*\S+/i;
/**
 * Menção isolada das palavras (evita FP quando a chave JSON é `"password"`).
 */
const SENSITIVE_KEYWORD = /(?<![A-Za-z0-9_"])\b(password|token|secret)\b(?!"\s*:)/i;

/**
 * @param {string} message
 * @returns {{ suspected: boolean, patterns: string[] }}
 */
function getLogSecretScanFindings(message) {
  const text = message == null ? '' : String(message);
  if (text.length === 0) {
    return { suspected: false, patterns: [] };
  }

  const patterns = [];
  const add = (id) => {
    if (!patterns.includes(id)) patterns.push(id);
  };

  if (JWT_LIKE.test(text)) add('jwt_like');
  if (BEARER.test(text)) add('bearer_token');
  if (CPF_FORMATTED.test(text)) add('cpf_formatted');
  if (EMAIL.test(text)) add('email');
  if (LONG_B64.test(text)) add('long_base64');
  if (SENSITIVE_ASSIGN.test(text)) add('sensitive_key_value');
  else if (SENSITIVE_KEYWORD.test(text)) add('sensitive_keyword');

  return { suspected: patterns.length > 0, patterns };
}

/**
 * @param {string} message
 * @returns {boolean}
 */
function scanLogForSecrets(message) {
  return getLogSecretScanFindings(message).suspected;
}

module.exports = {
  scanLogForSecrets,
  getLogSecretScanFindings
};
