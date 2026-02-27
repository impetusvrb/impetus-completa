/**
 * CONTROLE DE CONTEXTO DA IA
 * buildContext(user, opts) - Busca apenas dados permitidos para o usuário.
 * Nunca envia banco inteiro. Nunca envia dados sensíveis sem permissão.
 */
const documentContext = require('./documentContext');
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
  } catch {
    permissions = [];
  }

  const hasFinancial = permissions.includes('VIEW_FINANCIAL') || permissions.includes('*');
  const hasHR = permissions.includes('VIEW_HR') || permissions.includes('*');
  const hasStrategic = permissions.includes('VIEW_STRATEGIC') || permissions.includes('*');

  const baseContext = await documentContext.buildAIContext({
    companyId,
    queryText,
    forDiagnostic
  });

  const parts = [baseContext];
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
