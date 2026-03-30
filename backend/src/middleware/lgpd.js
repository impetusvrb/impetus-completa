/**
 * Stubs mínimos para rotas LGPD / auditoria.
 * Substitua por lógica completa com tabelas de consentimento se necessário.
 */
const db = require('../db');

async function registerConsent(_payload) {
    return { ok: true };
}

async function revokeConsent(_userId, _type) {
    return { ok: true };
}

async function exportUserData(userId) {
  const r = await db.query('SELECT id, name, email, role, company_id FROM users WHERE id = $1', [
    userId
  ]);
  return { user: r.rows[0] || null, generated_at: new Date().toISOString() };
}

async function anonymizeUserData(_userId) {
    return { ok: true };
}

async function processDataRequest(_payload) {
  return { ok: true };
}

function sensitiveContentMiddleware(_req, _res, next) {
  next();
}

module.exports = {
  registerConsent,
  revokeConsent,
  exportUserData,
  anonymizeUserData,
  processDataRequest,
  sensitiveContentMiddleware
};
