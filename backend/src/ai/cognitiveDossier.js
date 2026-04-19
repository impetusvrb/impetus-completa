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
      extras: data.extras && typeof data.extras === 'object' ? data.extras : {}
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

/** Evita gravar base64 gigante em auditoria */
function redactForPersistence(dossier) {
  const clone = JSON.parse(JSON.stringify(dossier));
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

module.exports = {
  createEmptyDossier,
  appendLog,
  recordStage,
  redactForPersistence
};
