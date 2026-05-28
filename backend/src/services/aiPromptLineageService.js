'use strict';

/**
 * AI Prompt Lineage — Versioned prompt + context + provider lineage
 *
 * Tracks: prompt hash, parent trace, temperature, context snapshot refs,
 * confidence, explainability linkage. Tenant-scoped, audit-friendly.
 *
 * Flag: IMPETUS_AI_GOVERNANCE_PERSISTENCE=off|audit|on
 */

const crypto = require('crypto');
const db = require('../db');
const aiModelRegistry = require('../governance/aiModelRegistry');

const LAYER = 'AI_PROMPT_LINEAGE';
const PROMPT_VERSION = '1.0.0';

function _getMode() {
  const v = String(process.env.IMPETUS_AI_GOVERNANCE_PERSISTENCE || 'audit').trim().toLowerCase();
  if (['on', 'audit', 'off'].includes(v)) return v;
  return 'audit';
}

function _log(event, data) {
  try {
    console.info('[AI_PROMPT_LINEAGE]', JSON.stringify({
      _type: 'ai_prompt_lineage',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      mode: _getMode(),
      ...data,
    }));
  } catch { /* never throw */ }
}

function _hashPrompt(text) {
  if (!text) return null;
  const normalized = String(text).trim().slice(0, 32000);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Build lineage record from trace row (no PII in stored lineage — hashes + refs only).
 */
function buildLineageFromTrace(row, opts = {}) {
  const modelInfo = row.model_info || {};
  const input = row.input_payload || {};
  const output = row.output_response || {};

  const promptText =
    input.prompt ||
    input.input ||
    input.sanitized_prompt ||
    row.input ||
    null;

  const modelKey = aiModelRegistry.resolveModelKey(modelInfo);

  return {
    trace_id: row.trace_id,
    company_id: row.company_id,
    user_id: row.user_id || null,
    module_name: String(row.module_name || 'unknown').slice(0, 128),
    prompt_hash: _hashPrompt(promptText),
    prompt_version: PROMPT_VERSION,
    parent_trace_id: opts.parent_trace_id || input.parent_trace_id || null,
    model_key: modelKey,
    model_version: modelInfo.pipeline_version || modelInfo.model_version || '1.0.0',
    provider_lineage: {
      provider: modelInfo.provider || null,
      model: modelInfo.model || null,
      channel: modelInfo.channel || null,
      supplier_transparency_ref: !!modelInfo.supplier_transparency,
      stages: (modelInfo.stages || []).map((s) => ({
        stage: s.stage,
        provider: s.provider,
        model_hint: s.model_hint,
      })),
      models_touched: modelInfo.models_touched || [],
    },
    temperature_lineage: {
      temperature: modelInfo.temperature ?? input.temperature ?? opts.temperature ?? null,
      max_tokens: modelInfo.max_tokens_requested || input.max_tokens || null,
      top_p: modelInfo.top_p ?? null,
      recorded_at: new Date().toISOString(),
    },
    context_lineage: {
      session_ref: input.session_id || opts.session_id || null,
      conversation_ref: input.conversation_id || opts.conversation_id || null,
      context_keys: input.context_snapshot
        ? Object.keys(input.context_snapshot).slice(0, 20)
        : [],
      module: row.module_name,
      adaptive_mode: modelInfo.adaptive_governance?.response_mode || null,
    },
    confidence_snapshot: {
      confidence: output.confidence ?? output.confidence_score ?? modelInfo.confidence ?? null,
      risk_level: modelInfo.risk_level || row.data_classification?.risk_level || null,
      degraded: output.degraded === true || modelInfo.degraded === true,
      requires_human_validation: row.human_validation_status === 'PENDING',
    },
    explainability_ref: {
      trace_id: row.trace_id,
      decision_log_expected: true,
      explanation_layer_in_output: !!(output.explanation_layer || output.explanation),
      compliance_incident: !!row.compliance_incident,
      governance_tags: modelInfo.governance_tags || row.governance_tags || [],
    },
    runtime_metadata: {
      duration_ms: modelInfo.duration_ms || null,
      pipeline_version: modelInfo.pipeline_version || null,
      legal_basis: row.legal_basis || null,
      encryption_applied: modelInfo.encryption_applied === true,
      policy_effect: modelInfo.policy_enforcement?.policy_effect || null,
    },
    governance_metadata: {
      registry_version: aiModelRegistry.REGISTRY_VERSION,
      data_classification_risk: row.data_classification?.risk_level || null,
      recorded_by: 'ai_governance_persistence',
    },
    chat_message_id: opts.chat_message_id || null,
    legal_audit_log_id: opts.legal_audit_log_id || null,
  };
}

async function persistLineage(lineage) {
  const mode = _getMode();
  if (mode === 'off') return { ok: false, reason: 'mode_off' };
  if (!lineage?.trace_id || !lineage?.company_id) {
    return { ok: false, reason: 'missing_trace_or_tenant' };
  }

  if (mode === 'audit') {
    _log('lineage_audit', {
      trace_id: lineage.trace_id,
      model_key: lineage.model_key,
      prompt_hash: lineage.prompt_hash?.substring(0, 12),
      dry_run: true,
    });
    return { ok: true, mode: 'audit', dry_run: true, lineage_id: null };
  }

  try {
    const r = await db.query(
      `INSERT INTO ai_prompt_lineage (
        trace_id, company_id, user_id, module_name,
        prompt_hash, prompt_version, parent_trace_id,
        model_key, model_version,
        provider_lineage, temperature_lineage, context_lineage,
        confidence_snapshot, explainability_ref, runtime_metadata, governance_metadata,
        chat_message_id, legal_audit_log_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17,$18
      )
      ON CONFLICT (trace_id) DO UPDATE SET
        model_key = EXCLUDED.model_key,
        provider_lineage = EXCLUDED.provider_lineage,
        runtime_metadata = EXCLUDED.runtime_metadata,
        governance_metadata = EXCLUDED.governance_metadata,
        created_at = ai_prompt_lineage.created_at
      RETURNING id`,
      [
        lineage.trace_id,
        lineage.company_id,
        lineage.user_id,
        lineage.module_name,
        lineage.prompt_hash,
        lineage.prompt_version,
        lineage.parent_trace_id,
        lineage.model_key,
        lineage.model_version,
        JSON.stringify(lineage.provider_lineage || {}),
        JSON.stringify(lineage.temperature_lineage || {}),
        JSON.stringify(lineage.context_lineage || {}),
        JSON.stringify(lineage.confidence_snapshot || {}),
        JSON.stringify(lineage.explainability_ref || {}),
        JSON.stringify(lineage.runtime_metadata || {}),
        JSON.stringify(lineage.governance_metadata || {}),
        lineage.chat_message_id,
        lineage.legal_audit_log_id,
      ]
    );

    const id = r.rows[0]?.id;
    _log('lineage_persisted', { trace_id: lineage.trace_id, lineage_id: id });
    return { ok: true, mode: 'on', lineage_id: id };
  } catch (err) {
    if (err.code === '42P01') {
      _log('lineage_table_missing', { trace_id: lineage.trace_id });
      return { ok: false, reason: 'table_not_exists' };
    }
    _log('lineage_error', { error: err?.message, trace_id: lineage.trace_id });
    return { ok: false, error: err?.message };
  }
}

async function getLineageByTrace(traceId, companyId) {
  try {
    const r = await db.query(
      `SELECT id, trace_id, model_key, model_version, prompt_hash, prompt_version,
              provider_lineage, temperature_lineage, context_lineage,
              confidence_snapshot, explainability_ref, runtime_metadata, governance_metadata, created_at
       FROM ai_prompt_lineage
       WHERE trace_id = $1 AND company_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [traceId, companyId]
    );
    return r.rows[0] || null;
  } catch {
    return null;
  }
}

module.exports = {
  buildLineageFromTrace,
  persistLineage,
  getLineageByTrace,
  PROMPT_VERSION,
};
