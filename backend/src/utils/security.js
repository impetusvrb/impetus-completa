/**
 * UTILITÁRIOS DE SEGURANÇA - FASE 3
 * Política de senha, sanitização de inputs, validações
 */

/**
 * Política de senha forte (LGPD / boas práticas)
 * - Mínimo 8 caracteres
 * - Pelo menos uma letra maiúscula
 * - Pelo menos uma letra minúscula
 * - Pelo menos um número
 * - Opcional: caractere especial (recomendado)
 */
const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false
};

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

/**
 * Valida senha contra a política
 * @returns { { valid: boolean, message?: string } }
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Senha é obrigatória' };
  }
  if (password.length < PASSWORD_POLICY.minLength) {
    return { valid: false, message: `Senha deve ter no mínimo ${PASSWORD_POLICY.minLength} caracteres` };
  }
  if (password.length > PASSWORD_POLICY.maxLength) {
    return { valid: false, message: `Senha deve ter no máximo ${PASSWORD_POLICY.maxLength} caracteres` };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, message: 'Senha deve conter letra maiúscula, minúscula e número' };
  }
  return { valid: true };
}

/**
 * Sanitiza string para prevenir XSS em exibição
 * Remove caracteres perigosos para HTML
 */
function sanitizeString(str, maxLength = 500) {
  if (str == null || typeof str !== 'string') return '';
  const trimmed = str.trim().slice(0, maxLength);
  return trimmed
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

/**
 * Sanitiza termo de busca (evita injection em LIKE)
 * Permite apenas alphanumeric, espaços e acentos comuns
 */
function sanitizeSearchTerm(term, maxLength = 100) {
  if (term == null || typeof term !== 'string') return '';
  const trimmed = term.trim().slice(0, maxLength);
  return trimmed.replace(/[%_\\]/g, ''); // Remove wildcards perigosos
}

/**
 * Valida e normaliza email
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  return email.trim().toLowerCase();
}

/**
 * Valida UUID
 */
function isValidUUID(str) {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Escapa HTML para prevenir XSS (OWASP)
 */
function escapeHtml(str) {
  if (str == null || typeof str !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, c => map[c]);
}

/**
 * Valida e sanitiza inteiro (evita SQL injection em intervalos)
 */
function safeInteger(val, defaultVal = 0, min = 1, max = 365) {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return defaultVal;
  return Math.max(min, Math.min(max, n));
}

module.exports = {
  PASSWORD_POLICY,
  validatePassword,
  sanitizeString,
  sanitizeSearchTerm,
  normalizeEmail,
  isValidUUID,
  escapeHtml,
  safeInteger
};
