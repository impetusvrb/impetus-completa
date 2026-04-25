'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Fábrica do Dossiê Cognitivo — objeto único compartilhado entre etapas (sem chat entre modelos).
 */

function normalizePermissions(user) {
  const p = user?.permissions;
  if (Array.isArray(p)) return p.map(String);
  if (typeof p === 'object' && p !== null) return Object.keys(p).filter((k) => p[k]);
  return [];
}

function createEmptyDossier({ traceId = uuidv4(), user = {}, context = {}, data = {} }) {
  const now = new Date().toISOString();
  return {
    trace_id: traceId,
    pipeline_version:
      context.pipeline_version ||
      process.env.COGNITIVE_PIPELINE_VERSION ||
      'cognitive_council_v1',
    user: {
      id: user.id || user.user_id || null,
      role: user.role || null,
      department: user.department || user.department_resolved_name || null,
      hierarchy_level:
        typeof user.hierarchy_level === 'number' ? user.hierarchy_level : null,
      permissions: normalizePermissions(user),
      company_id: user.company_id || null
    },
    context: {
      module: context.module || 'unspecified',
      timestamp: context.timestamp || now,
      request: String(context.request || '').slice(0, 64000),
      intent: context.intent || null,
      locale: context.locale || 'pt-BR'
    },
    data: {
      kpis: Array.isArray(data.kpis) ? data.kpis : [],
      events: Array.isArray(data.events) ? data.events : [],
      assets: Array.isArray(data.assets) ? data.assets : [],
      documents: Array.isArray(data.documents) ? data.documents : [],
      images: Array.isArray(data.images) ? data.images : [],
      sensors: data.sensors && typeof data.sensors === 'object' ? data.sensors : {},
      extras: data.extras && typeof data.extras === 'object' ? data.extras : {},
      contextual_data:
        data.contextual_data && typeof data.contextual_data === 'object'
          ? { ...data.contextual_data }
          : {}
    },
    analysis: {
      perception: null,
      perception_structured: null,
      technical_analysis: null,
      technical_structured: null,
      hypotheses: [],
      risks: [],
      cross_validation: null,
      draft_recommendation: null
    },
    /** Dossiê canónico por etapa (sem comunicação direta entre IAs — só o backend preenche). */
    layers: {
      input: {},
      perception: {},
      technical: {},
      draft: {},
      validation: {},
      final: {}
    },
    decision: {
      recommendation: null,
      confidence: null,
      requires_human_validation: true
    },
    logs: [],
    meta: {
      degraded: false,
      degradation_reasons: [],
      models_touched: []
    }
  };
}

function appendLog(dossier, entry) {
  if (!dossier.logs) dossier.logs = [];
  dossier.logs.push({
    ts: new Date().toISOString(),
    ...entry
  });
}

/** Registra execução de etapa + deduplicação de provedores para billing/auditoria */
function recordStage(dossier, { stage, provider, model_hint, summary }) {
  if (provider && !dossier.meta.models_touched.includes(provider)) {
    dossier.meta.models_touched.push(provider);
  }
  appendLog(dossier, {
    stage,
    provider: provider || null,
    model_hint: model_hint || null,
    summary: (summary || '').slice(0, 2000)
  });
}

/** Evita gravar base64 gigante em auditoria + rascunho interno sensível */
function redactForPersistence(dossier) {
  const clone = JSON.parse(JSON.stringify(dossier));
  if (clone.analysis?.draft_recommendation && typeof clone.analysis.draft_recommendation === 'object') {
    clone.analysis.draft_recommendation = { _redacted: true, stage: 'draft_recommendation' };
  }
  if (clone.layers?.draft && Object.keys(clone.layers.draft).length) {
    clone.layers.draft = { _redacted: true, stage: 'draft' };
  }
  if (clone.data?.images?.length) {
    clone.data.images = clone.data.images.map((img, i) => {
      if (typeof img === 'string') {
        const len = img.length;
        return { index: i, bytes_approx: len, redacted: true };
      }
      if (img && typeof img === 'object') {
        return {
          index: i,
          mime: img.mime || img.mimeType || null,
          bytes_approx: img.base64 ? String(img.base64).length : null,
          redacted: true
        };
      }
      return { index: i, redacted: true };
    });
  }
  return clone;
}

function seedLayerInput(dossier) {
  if (!dossier.layers) dossier.layers = {};
  dossier.layers.input = {
    pedido_texto: String(dossier.context?.request || '').slice(0, 64000),
    intencao: dossier.context?.intent || null,
    modulo: dossier.context?.module || null,
    industrial: {
      sensores: dossier.data?.sensors || {},
      dashboards: dossier.data?.extras?.dashboards ?? null,
      chat_interno: dossier.data?.extras?.chat_interno ?? null,
      manuais: dossier.data?.extras?.manuais ?? null,
      historico: dossier.data?.extras?.historico ?? null,
      kpis: dossier.data?.kpis || [],
      eventos: dossier.data?.events || [],
      ativos: dossier.data?.assets || [],
      documentos: dossier.data?.documents || [],
      imagens_presentes: Array.isArray(dossier.data?.images) ? dossier.data.images.length : 0
    }
  };
}

function finalizeLayerFinal(dossier, { synthesis, finalText }) {
  if (!dossier.layers) dossier.layers = {};
  dossier.layers.final = {
    texto_resposta: synthesis?.answer != null ? String(synthesis.answer) : String(finalText || '').trim(),
    confianca: synthesis?.confidence != null ? synthesis.confidence : null,
    requer_acao_humana: !!synthesis?.requires_action,
    trace_id: dossier.trace_id,
    baseado_em: synthesis?.based_on || [],
    avisos: synthesis?.warnings || [],
    explanation_layer: synthesis?.explanation_layer || null
  };
}

/**
 * Resposta HTTP: não expor JSON interno do rascunho GPT nem prompts.
 */
function sanitizeLayersForHttpResponse(dossier) {
  const L = dossier.layers || {};
  return {
    input: L.input || {},
    perception: L.perception || {},
    technical: L.technical || {},
    draft: Object.keys(L.draft || {}).length
      ? { internal_only: true, stage_completed: true, not_exposed_to_user: true }
      : {},
    validation: L.validation || {},
    final: L.final || {}
  };
}

module.exports = {
  createEmptyDossier,
  appendLog,
  recordStage,
  redactForPersistence,
  seedLayerInput,
  finalizeLayerFinal,
  sanitizeLayersForHttpResponse
};
