'use strict';

/**
 * Anonimização de PII para chamadas externas de IA (LGPD).
 *
 * Não é criptografia — é redação de padrões antes de o texto sair do backend.
 * Combinado com `aiEgressGuardService` em camadas a jusante; aqui é a primeira barreira.
 */

const PATTERNS = [
  { re: /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/gi, label: '[email]' },
  { re: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, label: '[cnpj]' },
  { re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, label: '[cpf]' },
  { re: /\b\d{14}\b/g, label: '[digits14]' },
  { re: /\b\d{11}\b/g, label: '[digits11]' },
  { re: /\b(?:\d[ \-.]*?){13,19}\b/g, label: '[digits_long]' },
  {
    re: /\b(?:\(?\s*(?:0?)?([1-9]{2})\s*\)?\s*)(?:9\s*)?\d{4}[\s.-]?\d{4}\b/g,
    label: '[phone]'
  }
];

/**
 * @param {string} input
 * @returns {string}
 */
function anonymizeText(input) {
  if (input == null) return '';
  let out = String(input);
  for (const { re, label } of PATTERNS) {
    out = out.replace(re, label);
  }
  return out;
}

/**
 * Cópia profunda anonimizando strings; preserva tipos primitivos não-string.
 * Não tenta detectar PII em chaves — assume payload do produto, não esquema arbitrário externo.
 * @param {any} value
 * @returns {any}
 */
function anonymizePayload(value) {
  if (value == null) return value;
  if (typeof value === 'string') return anonymizeText(value);
  if (Array.isArray(value)) return value.map(anonymizePayload);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = anonymizePayload(v);
    }
    return out;
  }
  return value;
}

module.exports = {
  anonymizeText,
  anonymizePayload
};
