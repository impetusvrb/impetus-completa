'use strict';

/**
 * AI Model Registry — Enterprise canonical registry (ISO 42001 aligned)
 *
 * Declarative source-of-truth for models + optional DB sync.
 * Each entry includes: AI card, risk classification, governance metadata, versioning.
 *
 * Flag: IMPETUS_AI_MODEL_REGISTRY=off|audit|on (default audit)
 */

const db = require('../db');

const LAYER = 'AI_MODEL_REGISTRY';
const REGISTRY_VERSION = '1.0.0';

const RISK = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

/** Canonical models — additive seed (synced to DB when mode != off) */
const CANONICAL_MODELS = Object.freeze([
  {
    model_key: 'openai:gpt-4o',
    provider: 'openai',
    model_id: 'gpt-4o',
    version: '2024-05-13',
    display_name: 'GPT-4o',
    risk_classification: RISK.MEDIUM,
    iso_42001_controls: ['A.5.2', 'A.6.2.2', 'A.8.2'],
    governance_metadata: {
      human_oversight: 'required_for_critical',
      training_data_policy: 'api_no_training_default',
      data_residency: 'provider_regions',
    },
    ai_card: {
      purpose: 'Conversational AI — industrial assistant',
      capabilities: ['chat', 'reasoning', 'multimodal'],
      limitations: ['No autonomous execution without policy gate'],
      transparency_level: 'high',
    },
  },
  {
    model_key: 'openai:gpt-4o-mini',
    provider: 'openai',
    model_id: 'gpt-4o-mini',
    version: '2024-07-18',
    display_name: 'GPT-4o Mini',
    risk_classification: RISK.LOW,
    iso_42001_controls: ['A.5.2', 'A.6.2.2'],
    governance_metadata: {
      human_oversight: 'recommended',
      training_data_policy: 'api_no_training_default',
    },
    ai_card: {
      purpose: 'Fast conversational AI — high-volume chat',
      capabilities: ['chat', 'summarization'],
      limitations: ['Reduced reasoning depth vs gpt-4o'],
      transparency_level: 'high',
    },
  },
  {
    model_key: 'anthropic:claude-3-5-sonnet',
    provider: 'anthropic',
    model_id: 'claude-3-5-sonnet-20241022',
    version: '20241022',
    display_name: 'Claude 3.5 Sonnet',
    risk_classification: RISK.MEDIUM,
    iso_42001_controls: ['A.5.2', 'A.6.2.2', 'A.8.2'],
    governance_metadata: {
      human_oversight: 'required_for_critical',
      training_data_policy: 'commercial_api_terms',
    },
    ai_card: {
      purpose: 'Enterprise reasoning and analysis',
      capabilities: ['chat', 'long_context', 'analysis'],
      limitations: ['Policy enforcement via IMPETUS gateway'],
      transparency_level: 'high',
    },
  },
  {
    model_key: 'google:gemini-1.5-pro',
    provider: 'google',
    model_id: 'gemini-1.5-pro',
    version: '001',
    display_name: 'Gemini 1.5 Pro',
    risk_classification: RISK.MEDIUM,
    iso_42001_controls: ['A.5.2', 'A.6.2.2'],
    governance_metadata: { human_oversight: 'recommended' },
    ai_card: {
      purpose: 'Multimodal industrial insights',
      capabilities: ['chat', 'vision', 'long_context'],
      transparency_level: 'medium',
    },
  },
  {
    model_key: 'impetus:cognitive-council',
    provider: 'impetus',
    model_id: 'cognitive_council',
    version: '2.0.0',
    display_name: 'IMPETUS Cognitive Council',
    risk_classification: RISK.HIGH,
    iso_42001_controls: ['A.5.2', 'A.6.2.2', 'A.8.2', 'A.9.3'],
    governance_metadata: {
      human_oversight: 'mandatory_hitl',
      multi_model: true,
      compliance_engine: true,
    },
    ai_card: {
      purpose: 'Orchestrated multi-stage industrial AI pipeline',
      capabilities: ['orchestration', 'compliance', 'explainability'],
      limitations: ['Execution gated by runtime state enforcement'],
      transparency_level: 'full',
    },
  },
]);

function _getMode() {
  const v = String(process.env.IMPETUS_AI_MODEL_REGISTRY || 'audit').trim().toLowerCase();
  if (['on', 'audit', 'off'].includes(v)) return v;
  return 'audit';
}

function _log(event, data) {
  try {
    console.info('[AI_MODEL_REGISTRY]', JSON.stringify({
      _type: 'ai_model_registry',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      mode: _getMode(),
      ...data,
    }));
  } catch { /* never throw */ }
}

/**
 * Resolve model_key from runtime model_info.
 */
function resolveModelKey(modelInfo = {}) {
  const provider = String(modelInfo.provider || modelInfo.supplier_transparency?.provider_key || 'unknown').toLowerCase();
  const model = String(modelInfo.model || modelInfo.model_resolved || modelInfo.supplier_transparency?.model_resolved || 'unknown').toLowerCase();
  if (
    model.includes('cognitive_council') ||
    model.includes('cognitive-council') ||
    modelInfo.orchestration === 'cognitive_council'
  ) {
    return 'impetus:cognitive-council';
  }
  return `${provider}:${model}`;
}

/**
 * Get registry entry (memory first, then DB).
 */
async function getModel(modelKey) {
  const canonical = CANONICAL_MODELS.find((m) => m.model_key === modelKey);
  if (canonical) return { ...canonical, source: 'canonical' };

  if (_getMode() === 'off') return null;

  try {
    const r = await db.query(
      `SELECT * FROM ai_model_registry WHERE model_key = $1 AND active = true LIMIT 1`,
      [modelKey]
    );
    if (r.rows[0]) return { ...r.rows[0], source: 'database' };
  } catch (err) {
    if (err.code !== '42P01') _log('get_model_error', { error: err?.message });
  }

  return canonical ? { ...canonical, source: 'canonical_fallback' } : null;
}

/**
 * Build AI Card for a trace/runtime context.
 */
async function buildAiCard(modelInfo = {}, opts = {}) {
  const modelKey = resolveModelKey(modelInfo);
  const entry = await getModel(modelKey);

  const card = {
    registry_version: REGISTRY_VERSION,
    model_key: modelKey,
    generated_at: new Date().toISOString(),
    ...(entry ? {
      display_name: entry.display_name,
      provider: entry.provider,
      model_id: entry.model_id,
      model_version: entry.version || modelInfo.pipeline_version,
      risk_classification: entry.risk_classification,
      iso_42001_controls: entry.iso_42001_controls || [],
      governance: entry.governance_metadata,
      card: entry.ai_card,
    } : {
      display_name: modelInfo.model || 'unknown',
      provider: modelInfo.provider || 'unknown',
      risk_classification: RISK.MEDIUM,
      card: { purpose: 'Unregistered model — default governance applied' },
    }),
    runtime: {
      pipeline_version: modelInfo.pipeline_version || null,
      duration_ms: modelInfo.duration_ms || null,
      confidence: opts.confidence ?? modelInfo.confidence ?? null,
      temperature: modelInfo.temperature ?? opts.temperature ?? null,
      max_tokens: modelInfo.max_tokens_requested || null,
    },
    explainability: {
      trace_id: opts.trace_id || null,
      decision_log_ref: opts.decision_log_id || null,
      explanation_layer_present: !!opts.has_explanation_layer,
    },
  };

  return card;
}

/**
 * Sync canonical models to DB (idempotent upsert).
 */
async function syncRegistryToDatabase() {
  const mode = _getMode();
  if (mode === 'off') return { synced: 0, reason: 'mode_off' };

  let synced = 0;
  for (const m of CANONICAL_MODELS) {
    try {
      await db.query(
        `INSERT INTO ai_model_registry (
          model_key, provider, model_id, version, display_name,
          risk_classification, governance_metadata, ai_card, iso_42001_controls, active, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,true,NOW())
        ON CONFLICT (model_key) DO UPDATE SET
          version = EXCLUDED.version,
          display_name = EXCLUDED.display_name,
          risk_classification = EXCLUDED.risk_classification,
          governance_metadata = EXCLUDED.governance_metadata,
          ai_card = EXCLUDED.ai_card,
          iso_42001_controls = EXCLUDED.iso_42001_controls,
          updated_at = NOW()`,
        [
          m.model_key, m.provider, m.model_id, m.version, m.display_name,
          m.risk_classification,
          JSON.stringify(m.governance_metadata || {}),
          JSON.stringify(m.ai_card || {}),
          JSON.stringify(m.iso_42001_controls || []),
        ]
      );
      synced++;
    } catch (err) {
      if (err.code === '42P01') {
        _log('sync_skipped', { reason: 'table_not_exists' });
        return { synced: 0, reason: 'table_not_exists' };
      }
      _log('sync_error', { model_key: m.model_key, error: err?.message });
    }
  }

  _log('sync_completed', { synced, mode });
  return { synced, mode };
}

async function listModels(opts = {}) {
  const mode = _getMode();
  const models = [...CANONICAL_MODELS];

  if (mode !== 'off') {
    try {
      const r = await db.query(
        `SELECT model_key, provider, model_id, version, display_name, risk_classification, active, updated_at
         FROM ai_model_registry WHERE active = true ORDER BY provider, model_id`
      );
      if (r.rows.length) {
        return r.rows.map((row) => ({
          ...row,
          ai_card: CANONICAL_MODELS.find((c) => c.model_key === row.model_key)?.ai_card,
        }));
      }
    } catch { /* fallback canonical */ }
  }

  return models;
}

function getDiagnostics() {
  return {
    mode: _getMode(),
    registry_version: REGISTRY_VERSION,
    canonical_models: CANONICAL_MODELS.length,
    risk_levels: Object.values(RISK),
  };
}

module.exports = {
  RISK,
  REGISTRY_VERSION,
  CANONICAL_MODELS,
  resolveModelKey,
  getModel,
  buildAiCard,
  syncRegistryToDatabase,
  listModels,
  getDiagnostics,
};
