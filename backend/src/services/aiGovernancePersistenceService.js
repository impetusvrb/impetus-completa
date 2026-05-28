'use strict';

/**
 * AI Governance Persistence — Orchestrates registry, cards, lineage across stores
 *
 * Persists governance metadata to:
 *   - ai_interaction_traces (model_info enrichment via UPDATE)
 *   - ai_prompt_lineage (lineage table)
 *   - chat_messages.ai_governance_metadata (when message_id provided)
 *   - audit_logs (governance event, no PII)
 *
 * Non-blocking hook from insertAiTrace.
 */

const db = require('../db');
const aiModelRegistry = require('../governance/aiModelRegistry');
const promptLineage = require('./aiPromptLineageService');

const LAYER = 'AI_GOVERNANCE_PERSISTENCE';

function _log(event, data) {
  try {
    console.info('[AI_GOVERNANCE_PERSIST]', JSON.stringify({
      _type: 'ai_governance_persistence',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      ...data,
    }));
  } catch { /* never throw */ }
}

/**
 * Main hook — call after trace insert succeeds.
 */
async function onTracePersisted(row, opts = {}) {
  const registryMode = String(process.env.IMPETUS_AI_MODEL_REGISTRY || 'audit').toLowerCase();
  const persistMode = String(process.env.IMPETUS_AI_GOVERNANCE_PERSISTENCE || 'audit').toLowerCase();

  if (registryMode === 'off' && persistMode === 'off') {
    return { ok: false, reason: 'governance_disabled' };
  }

  if (!row?.trace_id || !row?.company_id) {
    return { ok: false, reason: 'missing_context' };
  }

  try {
    const modelInfo = row.model_info || {};
    const aiCard = await aiModelRegistry.buildAiCard(modelInfo, {
      trace_id: row.trace_id,
      confidence: row.output_response?.confidence,
      temperature: modelInfo.temperature,
      has_explanation_layer: !!(row.output_response?.explanation_layer),
    });

    const lineage = promptLineage.buildLineageFromTrace(row, opts);
    const lineageResult = await promptLineage.persistLineage(lineage);

    const governanceEnvelope = {
      ai_card: aiCard,
      lineage_id: lineageResult.lineage_id || null,
      lineage_mode: lineageResult.mode,
      persisted_at: new Date().toISOString(),
      registry_version: aiModelRegistry.REGISTRY_VERSION,
    };

    // Enrich model_info on trace (mode=on only)
    if (persistMode === 'on') {
      await _enrichTraceModelInfo(row.trace_id, row.company_id, governanceEnvelope);
    }

    // chat_messages metadata
    if (opts.chat_message_id && persistMode === 'on') {
      await _attachChatMessageGovernance(opts.chat_message_id, row.company_id, governanceEnvelope);
    }

    // Audit trail (counts only)
    await _emitGovernanceAudit(row, aiCard, lineageResult);

    _log('trace_governance_completed', {
      trace_id: row.trace_id,
      model_key: lineage.model_key,
      lineage_mode: lineageResult.mode,
    });

    return {
      ok: true,
      trace_id: row.trace_id,
      model_key: lineage.model_key,
      ai_card: aiCard,
      lineage: lineageResult,
    };
  } catch (err) {
    _log('trace_governance_error', { error: err?.message, trace_id: row.trace_id });
    return { ok: false, error: err?.message };
  }
}

async function _enrichTraceModelInfo(traceId, companyId, envelope) {
  try {
    await db.query(
      `UPDATE ai_interaction_traces
       SET model_info = COALESCE(model_info, '{}'::jsonb) || $3::jsonb
       WHERE trace_id = $1 AND company_id = $2`,
      [
        traceId,
        companyId,
        JSON.stringify({ ai_governance: envelope }),
      ]
    );
  } catch (err) {
    _log('enrich_trace_error', { error: err?.message });
  }
}

async function _attachChatMessageGovernance(messageId, companyId, envelope) {
  try {
    await db.query(
      `UPDATE chat_messages cm
       SET ai_governance_metadata = $3::jsonb
       FROM chat_conversations cc
       WHERE cm.id = $1 AND cm.conversation_id = cc.id AND cc.company_id = $2`,
      [messageId, companyId, JSON.stringify(envelope)]
    );
  } catch (err) {
    if (err.code === '42703') {
      _log('chat_governance_column_missing', {});
      return;
    }
    _log('chat_governance_error', { error: err?.message });
  }
}

async function _emitGovernanceAudit(row, aiCard, lineageResult) {
  try {
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
       VALUES ('ai_governance_trace', 'ai_trace', $1, 'system:ai_governance', NOW(), $2)`,
      [
        JSON.stringify({
          trace_id: row.trace_id,
          model_key: aiCard.model_key,
          risk_classification: aiCard.risk_classification,
          lineage_mode: lineageResult.mode,
          registry_version: aiCard.registry_version,
        }),
        row.company_id,
      ]
    );
  } catch { /* non-blocking */ }
}

/**
 * ISO 42001 readiness summary (aggregated, no PII).
 */
async function getIso42001ReadinessReport(companyId = null) {
  const registry = await aiModelRegistry.listModels();
  const modelsWithControls = registry.filter(
    (m) => (m.iso_42001_controls || []).length > 0
  );

  let lineageCount = 0;
  let tracesWithGovernance = 0;
  let highRiskTraces = 0;

  try {
    const params = [];
    let where = `created_at >= NOW() - INTERVAL '90 days'`;
    if (companyId) {
      params.push(companyId);
      where += ` AND company_id = $${params.length}`;
    }

    const lineageQ = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM ai_prompt_lineage WHERE ${where.replace('created_at', 'ai_prompt_lineage.created_at')}`,
      params
    );
    lineageCount = lineageQ.rows[0]?.cnt || 0;

    const traceQ = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE model_info ? 'ai_governance')::int AS with_gov,
         COUNT(*) FILTER (WHERE (data_classification->>'risk_level') IN ('HIGH','CRITICAL'))::int AS high_risk
       FROM ai_interaction_traces WHERE ${where}`,
      params
    );
    tracesWithGovernance = traceQ.rows[0]?.with_gov || 0;
    highRiskTraces = traceQ.rows[0]?.high_risk || 0;
  } catch { /* tables may not exist yet */ }

  const controlsCovered = new Set();
  for (const m of modelsWithControls) {
    for (const c of m.iso_42001_controls || []) controlsCovered.add(c);
  }

  return {
    ok: true,
    iso_42001_readiness: {
      registry_models: registry.length,
      models_with_iso_controls: modelsWithControls.length,
      controls_covered: [...controlsCovered],
      lineage_records_90d: lineageCount,
      traces_with_governance_metadata: tracesWithGovernance,
      high_risk_traces_90d: highRiskTraces,
      human_oversight: 'HITL via ai_interaction_traces.human_validation_status',
      explainability: 'ai_decision_logs.explanation_layer + prompt_lineage',
      audit_trail: 'audit_logs + ai_legal_audit_logs (immutable)',
    },
    gaps: [
      lineageCount === 0 ? 'No prompt lineage records yet — enable IMPETUS_AI_GOVERNANCE_PERSISTENCE=on' : null,
      tracesWithGovernance === 0 ? 'Trace governance metadata not enriched — persistence mode audit/off' : null,
    ].filter(Boolean),
    generated_at: new Date().toISOString(),
  };
}

function enqueueTraceGovernance(row, opts = {}) {
  setImmediate(() => {
    onTracePersisted(row, opts).catch((e) => {
      _log('enqueue_error', { error: e?.message });
    });
  });
}

module.exports = {
  onTracePersisted,
  enqueueTraceGovernance,
  getIso42001ReadinessReport,
};
