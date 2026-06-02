'use strict';

/**
 * FASE 34 — Operational Truth Closure
 * Pipeline canónico: LLM → Truth Enforcement → Audit Trace → Response
 */

const db = require('../db');

/**
 * Aplica truth enforcement a texto cognitivo (resposta ao utilizador).
 * @returns {{ text: string, meta: object }}
 */
async function applyCognitiveTextTruth(text, opts = {}) {
  const truth = require('./industrialTruthEnforcementService');
  const result = await truth.enforceTextResponse(String(text || ''), opts);
  return {
    text: result.text,
    meta: {
      enforced: result.enforced !== false,
      mode: result.mode,
      action: result.action,
      skipped: result.skipped || null,
      evidence_binding: result.evidence_binding || null,
      unsupported_claims: result.unsupported_claims || [],
      shadow_would_replace: result.shadow_would_replace || null
    }
  };
}

/**
 * Avaliação shadow para voz — não altera UX.
 */
async function assessVoiceTranscriptShadow(user, payload = {}) {
  const truth = require('./industrialTruthEnforcementService');
  const assistantText = String(payload.assistant_text || payload.assistantText || '').trim();
  const queryText = String(payload.query_text || payload.queryText || payload.user_text || '').trim();
  const channel = String(payload.channel || 'anam_voice').slice(0, 64);

  const assessment = await truth.shadowAssessTextResponse(assistantText, {
    user,
    channel,
    queryText,
    injectOperational: payload.inject_operational !== false
  });

  await persistVoiceShadowAudit(user, {
    channel,
    queryText: queryText.slice(0, 2000),
    assistantExcerpt: assistantText.slice(0, 4000),
    assessment
  });

  return assessment;
}

async function persistVoiceShadowAudit(user, row) {
  if (!user?.company_id) return;
  try {
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
       VALUES ('voice_truth_shadow', 'ai_voice', $1, $2, NOW(), $3)`,
      [
        JSON.stringify({
          channel: row.channel,
          would_replace: row.assessment?.would_replace,
          would_block: row.assessment?.would_block,
          confidence: row.assessment?.confidence,
          action: row.assessment?.action,
          evidence_binding: row.assessment?.evidence_binding,
          query_excerpt_len: row.queryText?.length || 0,
          assistant_excerpt_len: row.assistantExcerpt?.length || 0
        }),
        String(user.email || user.name || user.id || 'voice_shadow').slice(0, 120),
        user.company_id
      ]
    );
  } catch (e) {
    console.warn('[VOICE_TRUTH_SHADOW_AUDIT]', e?.message || e);
  }
}

/**
 * Trace pós-truth (hallucination hook via aiAnalytics).
 */
function enqueueCognitiveTrace(row) {
  if (!row?.trace_id || !row?.company_id) return;
  try {
    const aiAnalytics = require('./aiAnalyticsService');
    aiAnalytics.enqueueAiTrace(row);
  } catch (e) {
    console.warn('[TRUTH_CLOSURE_TRACE]', e?.message || e);
  }
}

/**
 * FASE 36-A — Claude Panel: truth + evidence + trace (paridade Dashboard Chat).
 */
async function finalizeClaudePanelResponse(user, rawResult, opts = {}) {
  const { v4: uuidv4 } = require('uuid');
  const truth = require('./industrialTruthEnforcementService');
  const dataLineageService = require('./dataLineageService');
  const traceId = uuidv4();
  const queryBlob = String(opts.queryBlob || '').slice(0, 8000);

  if (!rawResult || rawResult.shouldRender === false || !rawResult.panel) {
    const out = { ...rawResult, trace_id: traceId };
    if (user?.company_id) {
      enqueueCognitiveTrace({
        trace_id: traceId,
        user_id: user.id,
        company_id: user.company_id,
        module_name: 'claude_panel',
        input_payload: {
          user_transcript_excerpt: String(opts.userTranscript || '').slice(0, 2000),
          should_render: false,
          data_lineage: dataLineageService.buildLineageForChatContext({
            messagePreview: queryBlob.slice(0, 500),
            historyTurns: 0,
            snapshotIso: new Date().toISOString()
          })
        },
        output_response: { should_render: false, industrial_truth: { enforced: true, skipped: 'no_panel' } },
        model_info: { provider: 'claude', channel: 'claude_panel' }
      });
    }
    return out;
  }

  let availability = { has_any_data: false, domain_checks: [] };
  try {
    availability = await truth.checkOperationalAvailability(user, {
      queryText: queryBlob,
      injectOperational: opts.injectOperational !== false
    });
  } catch (e) {
    console.warn('[CLAUDE_PANEL_AVAILABILITY]', e?.message || e);
  }

  const guarded = truth.guardClaudePanelPayload(rawResult.panel, availability);
  const panel = guarded.panel;
  const evidence_binding = truth.buildEvidenceBinding(availability, 'claude_panel');
  const lineage = dataLineageService.buildLineageForChatContext({
    messagePreview: queryBlob.slice(0, 500),
    historyTurns: 0,
    snapshotIso: new Date().toISOString()
  });

  let descriptionTruth = null;
  const desc = String(panel?.description || '').trim();
  if (desc) {
    const t = await applyCognitiveTextTruth(desc, {
      user,
      channel: 'claude_panel_narrative',
      queryText: queryBlob,
      injectOperational: opts.injectOperational !== false
    });
    if (t.text !== desc && panel) panel.description = t.text;
    descriptionTruth = t.meta;
  }

  const industrial_truth = {
    enforced: true,
    channel: 'claude_panel',
    evidence_binding,
    truth_guard: guarded.truth_guard || panel?.truth_guard || null,
    narrative: descriptionTruth
  };

  const response = {
    ...rawResult,
    ok: rawResult.ok !== false,
    panel,
    trace_id: traceId,
    industrial_truth,
    evidence_binding,
    data_lineage: lineage
  };

  if (user?.company_id) {
    enqueueCognitiveTrace({
      trace_id: traceId,
      user_id: user.id,
      company_id: user.company_id,
      module_name: 'claude_panel',
      input_payload: {
        user_transcript_excerpt: String(opts.userTranscript || '').slice(0, 2000),
        assistant_excerpt: String(opts.assistantResponse || '').slice(0, 2000),
        data_lineage: lineage
      },
      output_response: {
        panel_type: panel?.type,
        should_render: panel?.shouldRender !== false,
        industrial_truth
      },
      model_info: { provider: 'claude', channel: 'claude_panel' }
    });
  }

  return response;
}

/**
 * FASE 36-B — ManuIA live copilot: truth + evidence + trace.
 */
async function finalizeManuIaCopilotReply(user, rawReply, opts = {}) {
  const { v4: uuidv4 } = require('uuid');
  const dataLineageService = require('./dataLineageService');
  const queryText =
    opts.queryText ||
    (Array.isArray(opts.messages) ? opts.messages.filter((m) => m.role === 'user').pop()?.content : '') ||
    '';
  const { text, meta } = await applyCognitiveTextTruth(String(rawReply || ''), {
    user,
    channel: 'manuia_live_assistance',
    queryText: String(queryText).slice(0, 8000),
    injectOperational: opts.injectOperational !== false,
    contextualPack: opts.dossier ? { dossier: opts.dossier } : undefined
  });
  const traceId = uuidv4();
  const lineage = dataLineageService.buildLineageForChatContext({
    messagePreview: String(queryText).slice(0, 500),
    historyTurns: Array.isArray(opts.messages) ? opts.messages.length : 0,
    snapshotIso: new Date().toISOString()
  });

  if (user?.company_id) {
    enqueueCognitiveTrace({
      trace_id: traceId,
      user_id: user.id,
      company_id: user.company_id,
      module_name: 'manuia_live_assistance',
      input_payload: {
        user_message: String(queryText).slice(0, 8000),
        has_dossier: !!opts.dossier,
        data_lineage: lineage
      },
      output_response: {
        reply: text.slice(0, 20000),
        industrial_truth: meta
      },
      model_info: { provider: 'openai', channel: 'manuia_live_assistance', model: 'gpt-4o-mini' }
    });
  }

  return {
    reply: text,
    trace_id: traceId,
    industrial_truth: meta,
    evidence_binding: meta?.evidence_binding || null,
    data_lineage: lineage
  };
}

/**
 * FASE 36-E — Metadados de truth para Smart Panel (output já passou por guardPanelVisualizationPayload).
 */
function buildPanelCommandTruthMeta(output = {}, availability = null) {
  const truth = require('./industrialTruthEnforcementService');
  const evidence_binding =
    availability && typeof availability === 'object'
      ? truth.buildEvidenceBinding(availability, 'smart_panel')
      : output?.truth_guard?.evidence_binding || null;
  return {
    enforced: true,
    channel: 'smart_panel',
    evidence_binding,
    truth_guard: output?.truth_guard || null
  };
}

module.exports = {
  applyCognitiveTextTruth,
  assessVoiceTranscriptShadow,
  persistVoiceShadowAudit,
  enqueueCognitiveTrace,
  finalizeClaudePanelResponse,
  finalizeManuIaCopilotReply,
  buildPanelCommandTruthMeta
};
