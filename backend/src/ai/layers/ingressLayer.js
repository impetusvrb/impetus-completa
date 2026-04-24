'use strict';

/**
 * Camada de ingresso — normalização de input, limpeza, limites de segurança iniciais e dossiê base.
 */

const {
  buildUserScope,
  assertSameCompany,
  sanitizeTextInput,
  assessHeuristicRisk,
  shouldForceHumanValidation
} = require('../cognitiveSecurity');
const { createEmptyDossier, seedLayerInput } = require('../cognitiveDossier');
const { PIPELINE_VERSION, INTENT } = require('../aiRoles');
const humanValidationClosureService = require('../../services/humanValidationClosureService');
const aiPromptGuardService = require('../../services/aiPromptGuardService');
const dataLineageService = require('../../services/dataLineageService');

/**
 * Normaliza entradas legadas (requestText + data) e o contrato novo (input + context).
 */
function normalizeRunInput(params) {
  const {
    user,
    requestText,
    input,
    data = {},
    context = {},
    module,
    options
  } = params;
  const textFromInput =
    input && typeof input === 'object' && input.text != null ? String(input.text).trim() : '';
  const textLegacy =
    requestText != null && String(requestText).trim() !== '' ? String(requestText).trim() : '';
  const merged = textFromInput || textLegacy;
  const ctx = context && typeof context === 'object' ? context : {};
  const baseData = data && typeof data === 'object' ? data : {};
  const mergedData = {
    ...baseData,
    kpis: Array.isArray(ctx.kpis)
      ? ctx.kpis
      : Array.isArray(baseData.kpis)
        ? baseData.kpis
        : [],
    events: Array.isArray(ctx.events)
      ? ctx.events
      : Array.isArray(baseData.events)
        ? baseData.events
        : [],
    assets: Array.isArray(ctx.assets)
      ? ctx.assets
      : Array.isArray(baseData.assets)
        ? baseData.assets
        : [],
    documents: Array.isArray(ctx.documents)
      ? ctx.documents
      : Array.isArray(baseData.documents)
        ? baseData.documents
        : [],
    images: Array.isArray(ctx.images)
      ? ctx.images
      : Array.isArray(baseData.images)
        ? baseData.images
        : [],
    sensors:
      ctx.sensors && typeof ctx.sensors === 'object'
        ? ctx.sensors
        : baseData.sensors && typeof baseData.sensors === 'object'
          ? baseData.sensors
          : {},
    extras: {
      ...(baseData.extras || {}),
      ...(ctx.extras && typeof ctx.extras === 'object' ? ctx.extras : {}),
      dashboards: ctx.dashboards != null ? ctx.dashboards : baseData.extras?.dashboards,
      chat_interno:
        ctx.chat_interno != null ? ctx.chat_interno : baseData.extras?.chat_interno,
      manuais: ctx.manuais != null ? ctx.manuais : baseData.extras?.manuais,
      historico: ctx.historico != null ? ctx.historico : baseData.extras?.historico
    }
  };
  return {
    user,
    requestText: merged,
    data: mergedData,
    module: module || 'cognitive_council',
    options: options && typeof options === 'object' ? options : {}
  };
}

function classifyIntent(request, dossier) {
  const req = (request || '').toLowerCase();
  const hasImages = (dossier?.data?.images?.length || 0) > 0;
  if (hasImages) return INTENT.ANALISE_MULTIMODAL;

  const nKpi = dossier?.data?.kpis?.length || 0;
  const nEv = dossier?.data?.events?.length || 0;
  if (
    nKpi + nEv > 3 &&
    (req.includes('indicador') || req.includes('kpi') || req.includes('dashboard'))
  ) {
    return INTENT.CONSULTA_DADOS;
  }

  const diagKw = [
    'falha',
    'parada',
    'alarme',
    'diagnostic',
    'manuten',
    'sensor',
    'vibra',
    'óleo',
    'oleo',
    'os ',
    'ordem'
  ];
  if (diagKw.some((k) => req.includes(k))) return INTENT.DIAGNOSTICO_OPERACIONAL;

  return INTENT.GENERICO_ASSISTIDO;
}

/**
 * Sanitização, guardas de ingresso, HITL opcional, dossiê inicial e risco heurístico.
 */
async function prepareCouncilIngress({ user, requestText: rt, data, module, options, traceId }) {
  const sanitized = sanitizeTextInput(rt);
  const scope = buildUserScope(user);
  assertSameCompany(user, user.company_id);

  if (sanitized) {
    const ingressOrch = aiPromptGuardService.analyzeIngressIntent(sanitized, user);
    if (ingressOrch.blocked && user?.company_id && user?.id) {
      await aiPromptGuardService.recordIngressSecurityEvent({
        user,
        companyId: user.company_id,
        moduleName: module || 'cognitive_council',
        userText: sanitized,
        guardResult: ingressOrch,
        channel: 'cognitive_orchestrator'
      });
      const secErr = new Error('PROMPT_SECURITY_INGRESS');
      secErr.code = 'PROMPT_SECURITY_INGRESS';
      throw secErr;
    }
    try {
      await humanValidationClosureService.tryClosePendingValidation({
        user,
        utterance: sanitized,
        modality: options?.validation_modality === 'VIDEO' ? 'VIDEO' : 'TEXT',
        gestureDescription:
          options?.gesture_description != null
            ? String(options.gesture_description).slice(0, 4000)
            : undefined
      });
    } catch (e) {
      console.warn('[HITL_COGNITIVE]', e?.message);
    }
  }

  const dossier = createEmptyDossier({
    traceId,
    user: scope,
    context: {
      module,
      request: sanitized,
      intent: null,
      pipeline_version: PIPELINE_VERSION
    },
    data
  });

  dossier.context.intent = classifyIntent(sanitized, dossier);
  seedLayerInput(dossier);
  dataLineageService.attachToDossier(dossier);

  const limitations = [];
  let risk = assessHeuristicRisk(sanitized, dossier);
  dossier.decision.risk_level = risk;
  dossier.decision.requires_human_validation = shouldForceHumanValidation(risk);

  return { sanitized, scope, dossier, limitations, risk };
}

module.exports = {
  normalizeRunInput,
  classifyIntent,
  prepareCouncilIngress
};
