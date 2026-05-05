'use strict';

/**
 * Validação central de env crítica no arranque.
 * Evita serviço a correr com segredos ou BD em falta (salvo ALLOW_PARTIAL_ENV).
 */

const MIN_JWT_LEN = 8;

/**
 * @returns {boolean}
 */
function isAllowPartialEnv() {
  return /^(1|true|yes)$/i.test(String(process.env.ALLOW_PARTIAL_ENV || '').trim());
}

/**
 * @param {string} s
 * @returns {boolean}
 */
function isValidPostgresUrl(s) {
  const t = String(s || '').trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== 'postgres:' && u.protocol !== 'postgresql:') return false;
    return Boolean(u.host);
  } catch {
    return false;
  }
}

/**
 * DATABASE_URL (preferido) ou variáveis explícitas usadas em src/db.
 * @returns {boolean}
 */
function isDatabaseConfigured() {
  if (isValidPostgresUrl(process.env.DATABASE_URL || '')) return true;
  const h = String(process.env.DB_HOST || '').trim();
  const n = String(process.env.DB_NAME || '').trim();
  const u = String(process.env.DB_USER || '').trim();
  return Boolean(h && n && u);
}

/**
 * @param {string} name
 * @param {string} value
 * @returns {string | null}
 */
function describeJwt(name, value) {
  const t = String(value || '').trim();
  if (!t) return `${name} está vazia ou não definida.`;
  if (t.length < MIN_JWT_LEN) {
    return `${name} é demasiado curta (mínimo ${MIN_JWT_LEN} caracteres, por segurança).`;
  }
  return null;
}

/**
 * @returns {{ valid: false, message: string } | { valid: true }}
 */
function getStrictConfigErrors() {
  const missing = [];
  const jwtErr = describeJwt('JWT_SECRET', process.env.JWT_SECRET);
  if (jwtErr) missing.push(jwtErr);
  const adminErr = describeJwt('IMPETUS_ADMIN_JWT_SECRET', process.env.IMPETUS_ADMIN_JWT_SECRET);
  if (adminErr) missing.push(adminErr);
  if (!isDatabaseConfigured()) {
    missing.push(
      'Base de dados: defina DATABASE_URL (postgresql://…) ou DB_HOST, DB_NAME e DB_USER (ver src/db).'
    );
  }
  if (missing.length === 0) return { valid: true };
  return {
    valid: false,
    message:
      'Configuração de ambiente incompleta ou inválida.\n' +
      missing.map((m) => `  - ${m}`).join('\n') +
      '\n\n' +
      'Defina as variáveis no .env ou no painel de secrets do alojamento. ' +
      'Em desenvolvimento local sem env completo, pode usar ALLOW_PARTIAL_ENV=true (não use em produção).'
  };
}

/**
 * Lança Error claro início de processo, ou emite aviso e retorna (ALLOW_PARTIAL_ENV).
 * @returns {void}
 */
function validateConfigOrThrow() {
  if (isAllowPartialEnv()) {
    const r = getStrictConfigErrors();
    if (r.valid) return;
    console.warn(
      '[CONFIG] ALLOW_PARTIAL_ENV ativo — arranque sem validação completa. Problemas:\n' + r.message
    );
    return;
  }
  const r = getStrictConfigErrors();
  if (r.valid) return;
  const err = new Error(r.message);
  err.name = 'ConfigError';
  throw err;
}

module.exports = {
  validateConfigOrThrow,
  isAllowPartialEnv,
  isValidPostgresUrl,
  isDatabaseConfigured,
  MIN_JWT_LEN
};
