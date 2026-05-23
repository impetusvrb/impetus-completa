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
const structuralAIGovernance = require('./structuralAIGovernanceService');
const { getUserPermissions } = require('../middleware/authorize');
const contextIntegrityService = require('./contextIntegrityService');
const contextExposureSanitizer = require('../security/contextExposureSanitizer');
const cognitiveFlags = require('../policyEngine/config/cognitiveFeatureFlags');
const { resolveCognitiveEnvelope } = require('../policyEngine/cognitiveEnvelopeResolver');

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

  const channel =
    options.channel != null ? String(options.channel).slice(0, 128) : 'secure_context';
  const effectiveUser = options.user || user || null;
  let structuralGov = null;
  try {
    structuralGov = await structuralAIGovernance.buildAIGovernancePackage(effectiveUser, {
      channel,
      queryText,
      companyId
    });
  } catch (err) {
    console.warn('[secureContextBuilder][structuralAIGovernance]', err?.message ?? err);
  }

  const baseContext = await documentContext.buildAIContext({
    companyId,
    queryText,
    forDiagnostic,
    user: structuralGov?.enrichedUser || effectiveUser
  });

  const parts = [
    IMPETUS_IA_SYSTEM_PROMPT_FULL,
    structuralGov?.system_append || '',
    baseContext
  ];
  if (!hasFinancial) {
    parts.push('\nRestrição: usuário sem VIEW_FINANCIAL. Não mencione dados financeiros.');
  }
  if (!hasHR) {
    parts.push('\nRestrição: usuário sem VIEW_HR. Não mencione salários, contratos ou demissões.');
  }
  if (!hasStrategic) {
    parts.push('\nRestrição: usuário sem VIEW_STRATEGIC. Não mencione clientes estratégicos.');
  }

  const base = {
    context: parts.join('\n'),
    permissions,
    scope: { financial: hasFinancial, hr: hasHR, strategic: hasStrategic }
  };
  const dataState =
    options.data_state != null
      ? String(options.data_state)
      : options.dataState != null
        ? String(options.dataState)
        : options.metrics && typeof options.metrics === 'object' && options.metrics.data_state != null
          ? String(options.metrics.data_state)
          : 'unknown';
  let bundle = await contextIntegrityService.attachIntegrityToBundle(base, {
    user: options.user || user || null,
    companyId,
    channel,
    data_state: dataState
  });

  if (cognitiveFlags.isContextSanitizerEnabled()) {
    const u = options.user || user || null;
    const envelope = resolveCognitiveEnvelope(u, {
      force: cognitiveFlags.isCognitiveEnvelopeEnabled()
    });
    if (options.context_pack && typeof options.context_pack === 'object') {
      bundle = {
        ...bundle,
        context_pack: contextExposureSanitizer.sanitizeContextForAI(options.context_pack, u, envelope)
      };
    }
    if (options.metrics && typeof options.metrics === 'object') {
      bundle = {
        ...bundle,
        metrics: contextExposureSanitizer.sanitizeContextForAI(options.metrics, u, envelope)
      };
    }
  }

  return bundle;
}

module.exports = { buildContext, build: buildContext };
