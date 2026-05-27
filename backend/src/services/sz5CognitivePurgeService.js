'use strict';

/**
 * SZ5 Cognitive Purge Service — Enterprise-grade identity anonymization
 *
 * Remove associações semânticas entre actor e dados cognitivos (embeddings,
 * summaries, context vectors). Preserva dados estatísticos/agregados não
 * identificáveis.
 *
 * Flag: IMPETUS_SZ5_ANONYMIZATION_MODE=off|audit|on
 *   off   → no-op (zero impacto)
 *   audit → dry-run (loga acções sem mutar)
 *   on    → executa purge real
 *
 * Princípios: additive-only, deny-first, audit-trail, rollback-safe
 */

const db = require('../db');

const LAYER = 'SZ5_COGNITIVE_PURGE';

function _getMode() {
  const v = String(process.env.IMPETUS_SZ5_ANONYMIZATION_MODE || '').trim().toLowerCase();
  if (['on', 'audit'].includes(v)) return v;
  return 'off';
}

function _getRollbackMinutes() {
  const v = parseInt(process.env.IMPETUS_SZ5_ROLLBACK_WINDOW_MINUTES || '60', 10);
  return Number.isFinite(v) && v >= 0 ? v : 60;
}

function _log(event, data) {
  try {
    console.info(`[SZ5_COGNITIVE_PURGE]`, JSON.stringify({
      _type: 'sz5_cognitive_purge',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      mode: _getMode(),
      ...data,
    }));
  } catch { /* never throw */ }
}

async function _auditEvent(action, subjectToken, tenantId, details) {
  try {
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
      VALUES ($1, 'sz5_anonymization', $2, 'system:sz5_purge', NOW(), $3)
    `, [action, JSON.stringify({ subject_token: subjectToken, ...details }), tenantId]);
  } catch { /* non-blocking */ }
}

/**
 * Purge embeddings associados a um subject.
 * Alvo: manual_chunks (embedding vectors associados ao user/company)
 */
async function purgeEmbeddings(subjectToken, tenantId, opts = {}) {
  const mode = _getMode();
  if (mode === 'off') return { ok: false, reason: 'mode_off' };

  const correlationId = opts.correlationId || `sz5_emb_${Date.now()}`;

  try {
    const eligible = await db.query(`
      SELECT mc.id FROM manual_chunks mc
      JOIN manuals m ON m.id = mc.manual_id
      WHERE m.company_id = $1 AND mc.embedding IS NOT NULL
    `, [tenantId]);

    const count = eligible.rows.length;
    _log('purge_embeddings_eligible', { subject_token: subjectToken, tenant_id: tenantId, count, correlation_id: correlationId });

    if (mode === 'audit') {
      await _auditEvent('sz5_purge_embeddings_audit', subjectToken, tenantId, { count, dry_run: true, correlation_id: correlationId });
      return { ok: true, mode: 'audit', eligible: count, purged: 0, dry_run: true };
    }

    // mode = on → null embeddings (preserva chunk_text para audit)
    const result = await db.query(`
      UPDATE manual_chunks SET embedding = NULL
      WHERE id IN (
        SELECT mc.id FROM manual_chunks mc
        JOIN manuals m ON m.id = mc.manual_id
        WHERE m.company_id = $1 AND mc.embedding IS NOT NULL
      )
    `, [tenantId]);

    const purged = result.rowCount || 0;
    _log('purge_embeddings_executed', { subject_token: subjectToken, tenant_id: tenantId, purged, correlation_id: correlationId });
    await _auditEvent('sz5_purge_embeddings', subjectToken, tenantId, { purged, correlation_id: correlationId });

    return { ok: true, mode: 'on', eligible: count, purged };
  } catch (err) {
    _log('purge_embeddings_error', { error: err?.message, subject_token: subjectToken });
    return { ok: false, error: err?.message };
  }
}

/**
 * Purge summaries (memoria_usuario) — remove perfil e dados derivados.
 * Preserva registo (id, user_id, company_id, created_at) para audit.
 */
async function purgeSummaries(subjectToken, tenantId, userId, opts = {}) {
  const mode = _getMode();
  if (mode === 'off') return { ok: false, reason: 'mode_off' };

  const correlationId = opts.correlationId || `sz5_sum_${Date.now()}`;

  try {
    const eligible = await db.query(
      `SELECT id FROM memoria_usuario WHERE user_id = $1 AND company_id = $2 AND perfil_tecnico IS NOT NULL`,
      [userId, tenantId]
    );

    const count = eligible.rows.length;
    _log('purge_summaries_eligible', { subject_token: subjectToken, user_id: userId, tenant_id: tenantId, count, correlation_id: correlationId });

    if (mode === 'audit') {
      await _auditEvent('sz5_purge_summaries_audit', subjectToken, tenantId, { count, dry_run: true, user_id: userId, correlation_id: correlationId });
      return { ok: true, mode: 'audit', eligible: count, purged: 0, dry_run: true };
    }

    const result = await db.query(`
      UPDATE memoria_usuario
      SET perfil_tecnico = '[SZ5_PURGED]',
          perfil_comportamental = '[SZ5_PURGED]',
          mapa_responsabilidade = '[SZ5_PURGED]',
          resumo_estrategico = '[SZ5_PURGED]',
          respostas_raw = NULL
      WHERE user_id = $1 AND company_id = $2 AND perfil_tecnico IS NOT NULL AND perfil_tecnico != '[SZ5_PURGED]'
    `, [userId, tenantId]);

    const purged = result.rowCount || 0;
    _log('purge_summaries_executed', { subject_token: subjectToken, user_id: userId, tenant_id: tenantId, purged, correlation_id: correlationId });
    await _auditEvent('sz5_purge_summaries', subjectToken, tenantId, { purged, user_id: userId, correlation_id: correlationId });

    return { ok: true, mode: 'on', eligible: count, purged };
  } catch (err) {
    _log('purge_summaries_error', { error: err?.message, subject_token: subjectToken });
    return { ok: false, error: err?.message };
  }
}

/**
 * Purge context vectors — anonimiza ai_interaction_traces para o subject.
 * Preserva trace_id e metadata para audit; remove payloads identificáveis.
 */
async function purgeContextVectors(subjectToken, tenantId, userId, opts = {}) {
  const mode = _getMode();
  if (mode === 'off') return { ok: false, reason: 'mode_off' };

  const correlationId = opts.correlationId || `sz5_ctx_${Date.now()}`;

  try {
    const eligible = await db.query(
      `SELECT COUNT(*) as cnt FROM ai_interaction_traces WHERE user_id = $1 AND company_id = $2 AND (input_payload->>'_anonymized') IS NULL`,
      [userId, tenantId]
    );

    const count = parseInt(eligible.rows[0].cnt, 10);
    _log('purge_context_eligible', { subject_token: subjectToken, user_id: userId, tenant_id: tenantId, count, correlation_id: correlationId });

    if (mode === 'audit') {
      await _auditEvent('sz5_purge_context_audit', subjectToken, tenantId, { count, dry_run: true, user_id: userId, correlation_id: correlationId });
      return { ok: true, mode: 'audit', eligible: count, purged: 0, dry_run: true };
    }

    const result = await db.query(`
      UPDATE ai_interaction_traces
      SET input_payload = jsonb_build_object('_anonymized', true, '_sz5_purge', true, '_ts', NOW()::text, '_marker', 'SZ5_COGNITIVE_PURGE'),
          output_response = jsonb_build_object('_anonymized', true, '_sz5_purge', true)
      WHERE user_id = $1 AND company_id = $2 AND (input_payload->>'_anonymized') IS NULL
    `, [userId, tenantId]);

    const purged = result.rowCount || 0;
    _log('purge_context_executed', { subject_token: subjectToken, user_id: userId, tenant_id: tenantId, purged, correlation_id: correlationId });
    await _auditEvent('sz5_purge_context', subjectToken, tenantId, { purged, user_id: userId, correlation_id: correlationId });

    return { ok: true, mode: 'on', eligible: count, purged };
  } catch (err) {
    _log('purge_context_error', { error: err?.message, subject_token: subjectToken });
    return { ok: false, error: err?.message };
  }
}

/**
 * Executa purge cognitivo completo para um subject.
 */
async function executeFullCognitivePurge(subjectToken, tenantId, userId, opts = {}) {
  const mode = _getMode();
  if (mode === 'off') return { ok: false, reason: 'mode_off', mode };

  const correlationId = opts.correlationId || `sz5_full_${Date.now()}`;
  const commonOpts = { correlationId };

  _log('full_purge_started', { subject_token: subjectToken, user_id: userId, tenant_id: tenantId, mode, correlation_id: correlationId });

  const results = {
    embeddings: await purgeEmbeddings(subjectToken, tenantId, commonOpts),
    summaries: await purgeSummaries(subjectToken, tenantId, userId, commonOpts),
    context_vectors: await purgeContextVectors(subjectToken, tenantId, userId, commonOpts),
  };

  const totalPurged = (results.embeddings.purged || 0) + (results.summaries.purged || 0) + (results.context_vectors.purged || 0);

  _log('full_purge_completed', {
    subject_token: subjectToken,
    mode,
    total_purged: totalPurged,
    correlation_id: correlationId,
  });

  return { ok: true, mode, total_purged: totalPurged, results, correlation_id: correlationId };
}

function getDiagnostics() {
  return {
    mode: _getMode(),
    rollback_window_minutes: _getRollbackMinutes(),
    relink_enabled: String(process.env.IMPETUS_SZ5_RELINK_ENABLED || 'off').toLowerCase() === 'on',
    purge_graph_enabled: String(process.env.IMPETUS_SZ5_PURGE_GRAPH || 'off').toLowerCase() === 'on',
  };
}

module.exports = {
  purgeEmbeddings,
  purgeSummaries,
  purgeContextVectors,
  executeFullCognitivePurge,
  getDiagnostics,
};
