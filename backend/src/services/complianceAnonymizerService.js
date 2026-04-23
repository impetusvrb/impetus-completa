'use strict';

/**
 * Anonimização superficial para respostas (minimização LGPD em texto).
 * Não altera armazenamento bruto do trace — apenas camada de saída.
 */

const PHONE_BR_RE =
  /\b(?:\+?55\s?)?(?:\(?0?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-.\s]?\d{4}\b/g;
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

/**
 * @param {string} text
 * @returns {string}
 */
function anonymizeSensitiveData(text) {
  if (typeof text !== 'string' || !text) return text;
  let t = text;
  t = t.replace(CPF_RE, '***.***.***-**');
  t = t.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, (full) => {
    const [u, d] = full.split('@');
    const safeUser = (u || 'u').slice(0, 2).toLowerCase();
    return `${safeUser}***@${(d || '').toLowerCase()}`;
  });
  t = t.replace(PHONE_BR_RE, '(**) ****-****');
  return t;
}

module.exports = {
  anonymizeSensitiveData
};
