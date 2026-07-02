/**
 * CERT-PULSE-05 FASE 1 — OrganizationalMemoryService (memória consultiva).
 * Não altera índices. Não substitui o Pulse.
 */
'use strict';

const db = require('../../../db');
const {
  buildFingerprint,
  buildSignatureFromContext,
  rankSimilarCases
} = require('./similarCaseSearch');
const { buildEvidenceRecommendations } = require('./evidenceRecommendations');

function parseJson(v) {
  if (v == null) return v;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch (_) {
    return v;
  }
}

async function memoryTableReady() {
  try {
    await db.query(`SELECT 1 FROM pulse_organizational_memory LIMIT 1`);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Captura snapshot consultivo após processamento cognitivo (fire-and-forget).
 */
async function captureSnapshot(companyId, ctx = {}) {
  if (!companyId || process.env.IMPETUS_PULSE_MEMORY === 'off') return { skipped: true };
  const ready = await memoryTableReady();
  if (!ready) return { skipped: true, reason: 'migration_required' };

  const signature = buildSignatureFromContext(ctx);
  const fingerprint = buildFingerprint(signature);

  try {
    const dup = await db.query(
      `
      SELECT id FROM pulse_organizational_memory
      WHERE company_id = $1 AND case_fingerprint = $2
        AND recorded_at >= now() - interval '7 days'
      LIMIT 1
    `,
      [companyId, fingerprint]
    );
    if (dup.rows?.length) return { skipped: true, reason: 'recent_duplicate' };

    await db.query(
      `
      INSERT INTO pulse_organizational_memory (
        company_id, scope_type, scope_key, scope_label, case_fingerprint,
        signal_signature, pattern_codes, pulse_index_before, organizational_state,
        confidence, source, human_validated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
    `,
      [
        companyId,
        ctx.scope_type || 'individual',
        ctx.scope_key || ctx.user_id || 'unknown',
        ctx.scope_label || null,
        fingerprint,
        JSON.stringify(signature),
        JSON.stringify(signature.pattern_codes || []),
        ctx.pulse_index ?? null,
        ctx.organizational_state || signature.organizational_state,
        ctx.confidence ?? 0.5,
        ctx.source || 'cognitive_snapshot'
      ]
    );
    return { ok: true };
  } catch (err) {
    console.warn('[organizationalMemory][capture]', err?.message || err);
    return { ok: false };
  }
}

/**
 * RH registra decisão humana e resultado (não altera pesos).
 */
async function recordHumanOutcome(companyId, body = {}, actorUserId = null) {
  const ready = await memoryTableReady();
  if (!ready) {
    return {
      ok: false,
      migration_required: true,
      message: 'Execute backend/src/models/pulse_cognitive_cert05_migration.sql'
    };
  }

  const signature = buildSignatureFromContext(body.context || body);
  const fingerprint = buildFingerprint(signature);
  const actions = Array.isArray(body.human_actions) ? body.human_actions : [];
  const outcome = body.outcome || { summary: body.outcome_summary || 'Resultado registrado pelo RH' };

  try {
    const r = await db.query(
      `
      INSERT INTO pulse_organizational_memory (
        company_id, scope_type, scope_key, scope_label, case_fingerprint,
        signal_signature, pattern_codes, pulse_index_before, pulse_index_after,
        organizational_state, human_actions, outcome, outcome_delta_percent,
        confidence, source, human_validated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)
      RETURNING *
    `,
      [
        companyId,
        body.scope_type || 'department',
        body.scope_key || 'all',
        body.scope_label || null,
        fingerprint,
        JSON.stringify(signature),
        JSON.stringify(signature.pattern_codes || []),
        body.pulse_index_before ?? body.pulse_index ?? null,
        body.pulse_index_after ?? null,
        body.organizational_state || signature.organizational_state,
        JSON.stringify(actions),
        JSON.stringify(outcome),
        body.outcome_delta_percent ?? null,
        Math.min(0.92, parseFloat(body.confidence) || 0.72),
        'human_outcome',
        true
      ]
    );
    return {
      ok: true,
      entry: r.rows[0],
      recorded_by: actorUserId,
      governance: { weights_not_modified: true, consultative_only: true }
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

async function loadMemoryRows(companyId, limit = 100) {
  const ready = await memoryTableReady();
  if (!ready) return [];
  try {
    const r = await db.query(
      `
      SELECT * FROM pulse_organizational_memory
      WHERE company_id = $1
      ORDER BY recorded_at DESC LIMIT $2
    `,
      [companyId, limit]
    );
    return r.rows || [];
  } catch (_) {
    return [];
  }
}

async function buildCurrentContext(companyId, scope = {}) {
  let pulseIndex = null;
  let state = null;
  let confidence = 0.45;
  let patterns = [];

  try {
    if (scope.user_id) {
      const r = await db.query(
        `SELECT pulse_index, organizational_state, confidence, correlations FROM pulse_cognitive_index
         WHERE company_id = $1 AND user_id = $2`,
        [companyId, scope.user_id]
      );
      const row = r.rows[0];
      if (row) {
        pulseIndex = parseFloat(row.pulse_index);
        state = row.organizational_state;
        confidence = parseFloat(row.confidence);
        const corr = parseJson(row.correlations) || [];
        patterns = corr.map((c) => c.type).filter(Boolean);
      }
    } else {
      const r = await db.query(
        `SELECT pulse_index, organizational_state, confidence FROM pulse_cognitive_aggregate_index
         WHERE company_id = $1 AND scope_type = 'company' AND scope_key = 'all'`,
        [companyId]
      );
      const row = r.rows[0];
      if (row) {
        pulseIndex = parseFloat(row.pulse_index);
        state = row.organizational_state;
        confidence = parseFloat(row.confidence);
      }
    }
  } catch (_) {}

  try {
    const p = await db.query(
      `
      SELECT pattern_code FROM pulse_cognitive_patterns
      WHERE company_id = $1 AND (expires_at IS NULL OR expires_at > now())
      ORDER BY detected_at DESC LIMIT 10
    `,
      [companyId]
    );
    patterns = [...patterns, ...(p.rows || []).map((x) => x.pattern_code)];
  } catch (_) {}

  let proacao = 0;
  let sst = 0;
  try {
    proacao = (
      await db.query(
        `SELECT COUNT(*)::int AS c FROM proposals WHERE company_id = $1 AND created_at >= now() - interval '30 days'`,
        [companyId]
      )
    ).rows[0]?.c || 0;
    sst = (
      await db.query(
        `SELECT COUNT(*)::int AS c FROM pulse_cognitive_events
         WHERE company_id = $1 AND event_type IN ('sst_incident','near_miss')
           AND created_at >= now() - interval '30 days'`,
        [companyId]
      )
    ).rows[0]?.c || 0;
  } catch (_) {}

  return {
    pulse_index: pulseIndex,
    organizational_state: state,
    confidence,
    pattern_codes: [...new Set(patterns)],
    proacao_count: proacao,
    sst_events: sst,
    scope
  };
}

/**
 * Fluxo consultivo: evento atual → histórico → casos semelhantes → recomendações assistivas.
 */
async function consultOrganizationalMemory(companyId, scope = {}) {
  const ready = await memoryTableReady();
  if (!ready) {
    return {
      ok: true,
      migration_required: true,
      message: 'Execute backend/src/models/pulse_cognitive_cert05_migration.sql',
      governance: { assistive_only: true, human_in_the_loop: true }
    };
  }

  const currentContext = await buildCurrentContext(companyId, scope);
  const signature = buildSignatureFromContext(currentContext);
  const memoryRows = await loadMemoryRows(companyId, 150);
  const similar = rankSimilarCases(signature, memoryRows, {
    min_score: parseFloat(scope.min_score) || 0.45,
    limit: parseInt(scope.limit, 10) || 5
  });

  const recommendations = buildEvidenceRecommendations(similar, currentContext);

  return {
    ok: true,
    framework: 'organizational_memory',
    cert: 'CERT-PULSE-05',
    current_signature: signature,
    current_context: currentContext,
    memory_entries_total: memoryRows.length,
    ...recommendations,
    flow: [
      'evento_atual',
      'busca_padroes_historicos',
      'casos_semelhantes',
      'resultados_obtidos',
      'probabilidade_historica',
      'recomendacoes_fundamentadas',
      'resposta_assistiva'
    ],
    indices_not_modified: true,
    governance: {
      assistive_only: true,
      human_in_the_loop: true,
      not_a_prediction: true,
      pulse_core_frozen: true
    }
  };
}

function scheduleCapture(companyId, ctx) {
  setImmediate(() => {
    captureSnapshot(companyId, ctx).catch(() => {});
  });
}

module.exports = {
  memoryTableReady,
  captureSnapshot,
  scheduleCapture,
  recordHumanOutcome,
  loadMemoryRows,
  buildCurrentContext,
  consultOrganizationalMemory
};
