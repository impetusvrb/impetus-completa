/**
 * CONTROLE DE CONTEXTO DA IA — FONTE ÚNICA (canónica)
 *
 * Caminho de referência no repositório: backend/src/services/secureContextBuilder.js
 * Não manter cópias paralelas (ex.: árvore legada impetus_complete/): qualquer outro caminho
 * deve reexportar este módulo ou apontar para o backend unificado na raiz.
 *
 * API: buildContext(user, opts) — dados permitidos ao utilizador + governance + documentContext.
 */
const documentContext = require('./documentContext');
const { IMPETUS_IA_SYSTEM_PROMPT_FULL } = require('./impetusAIGovernancePolicy');
const { getUserPermissions } = require('../middleware/authorize');

async function buildContext(user, opts) {
  const options = opts || {};
  const companyId = options.companyId || (user && user.company_id);
  const queryText = options.queryText || '';
  const forDiagnostic = options.forDiagnostic !== false;

  let permissions = [];
  try {
    const r = await getUserPermissions(user || {});
    permissions = r.permissions || [];
  } catch (err) {
    console.warn('[secureContextBuilder][get_user_permissions]', err?.message ?? err);
    permissions = [];
  }

  const hasFinancial = permissions.includes('VIEW_FINANCIAL') || permissions.includes('*');
  const hasHR = permissions.includes('VIEW_HR') || permissions.includes('*');
  const hasStrategic = permissions.includes('VIEW_STRATEGIC') || permissions.includes('*');

  const baseContext = await documentContext.buildAIContext({
    companyId,
    queryText,
    forDiagnostic,
    user: options.user || user || null
  });

  const parts = [IMPETUS_IA_SYSTEM_PROMPT_FULL, baseContext];
  if (!hasFinancial) {
    parts.push('\nRestrição: usuário sem VIEW_FINANCIAL. Não mencione dados financeiros.');
  }
  if (!hasHR) {
    parts.push('\nRestrição: usuário sem VIEW_HR. Não mencione salários, contratos ou demissões.');
  }
  if (!hasStrategic) {
    parts.push('\nRestrição: usuário sem VIEW_STRATEGIC. Não mencione clientes estratégicos.');
  }

  return {
    context: parts.join('\n'),
    permissions,
    scope: { financial: hasFinancial, hr: hasHR, strategic: hasStrategic }
  };
}

module.exports = { buildContext };
