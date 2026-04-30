'use strict';

/**
 * Correlação assíncrona decisão ↔ eventos reais (alertas, tarefas, eventos).
 * Failsafe: qualquer falha de BD → outcome neutro + heurística opcional.
 * Janela temporal pós-decisão + filtro causal por máquina (quando disponível).
 */

const {
  filterRelevantSignals,
  rowTsMs,
  machineIdOf
} = require('./unifiedSignalFilterService');

const HEURISTIC = 'heuristic_no_data';

function emptyImpact() {
  return {
    downtime_reduced: 0,
    incident_avoided: 0,
    cost_impact: 0
  };
}

function sevWeight(sev) {
  const s = sev != null ? String(sev).toLowerCase() : '';
  if (/crit|alta|high/.test(s)) return 3;
  if (/med|medium|m(e|é)dia/.test(s)) return 2;
  return 1;
}

function filterTemporalAndCausal(evidence, decisionTsMs, windowMs, decisionMachineId) {
  const dm = decisionMachineId != null ? String(decisionMachineId).trim() : '';
  const upper = decisionTsMs + windowMs;
  const out = [];
  for (const e of evidence) {
    const row = e && e.row && typeof e.row === 'object' ? e.row : {};
    const t = rowTsMs(row);
    if (t != null && (t < decisionTsMs || t > upper)) continue;
    if (dm) {
      const em = machineIdOf(row);
      if (em && em !== dm) continue;
    }
    out.push(e);
  }
  return out;
}

/**
 * @param {object} opts
 * @param {string} opts.decisionId
 * @param {string|null} [opts.companyId]
 * @param {number} [opts.decisionTimestampMs] — início da decisão (epoch)
 * @param {number} [opts.correlationWindowMs] — janela após decisão
 * @param {number} [opts.windowStartMs] — fallback legacy
 * @param {number} [opts.windowEndMs] — ignorado em favor de janela pós-decisão
 * @param {number} [opts.latencyMs]
 * @param {string|null} [opts.machine_id]
 * @returns {Promise<{ outcome_type: string, evidence: object[], impact_metrics: object, used_heuristic_fallback: boolean }>}
 */
async function correlateDecisionWithOutcome(opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  const decisionId = o.decisionId != null ? String(o.decisionId) : '';
  const companyId = o.companyId != null ? o.companyId : null;
  const evidence = [];
  const impact = emptyImpact();
  const now = Date.now();

  const decisionTsMs =
    Number(o.decisionTimestampMs) && Number.isFinite(Number(o.decisionTimestampMs))
      ? Number(o.decisionTimestampMs)
      : Number(o.windowStartMs) && Number.isFinite(Number(o.windowStartMs))
        ? Number(o.windowStartMs)
        : now - 180_000;

  const corrWindowMs = Math.min(
    3_600_000,
    Math.max(
      60_000,
      Number(o.correlationWindowMs) && Number.isFinite(Number(o.correlationWindowMs))
        ? Number(o.correlationWindowMs)
        : parseInt(process.env.UNIFIED_OUTCOME_CORRELATION_WINDOW_MS || '900000', 10)
    )
  );
  const tUpperMs = Math.min(now, decisionTsMs + corrWindowMs);
  const decisionMachineId =
    o.machine_id != null ? o.machine_id : o.decisionMachineId != null ? o.decisionMachineId : null;

  if (!decisionId || companyId == null || companyId === '') {
    return {
      outcome_type: 'neutral',
      evidence: [{ type: HEURISTIC, detail: 'missing_ids' }],
      impact_metrics: impact,
      used_heuristic_fallback: true
    };
  }

  const cid = String(companyId).trim();
  const t0 = new Date(decisionTsMs).toISOString();
  const t1 = new Date(tUpperMs).toISOString();

  let failScore = 0;
  let okScore = 0;

  try {
    const db = require('../db');

    try {
      const r = await db.query(
        `SELECT id, severity, title, created_at
         FROM alerts
         WHERE company_id::text = $1 AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz
         ORDER BY created_at DESC
         LIMIT 35`,
        [cid, t0, t1]
      );
      for (const row of r.rows || []) {
        evidence.push({ type: 'alert', source: 'alerts', row });
      }
    } catch (_a) {}

    try {
      const r = await db.query(
        `SELECT id, title, status, priority, created_at
         FROM tasks
         WHERE company_id::text = $1 AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz
         ORDER BY created_at DESC
         LIMIT 35`,
        [cid, t0, t1]
      );
      for (const row of r.rows || []) {
        evidence.push({ type: 'task', source: 'tasks', row });
      }
    } catch (_t) {}

    try {
      const r = await db.query(
        `SELECT id, severidade, tipo_alerta, titulo, created_at, metadata
         FROM operational_alerts
         WHERE company_id::text = $1 AND resolvido = false
           AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz
         ORDER BY created_at DESC
         LIMIT 25`,
        [cid, t0, t1]
      );
      for (const row of r.rows || []) {
        evidence.push({ type: 'operational_alert', source: 'operational_alerts', row });
      }
    } catch (_op) {}

    try {
      const r = await db.query(
        `
        SELECT impacto, descricao, created_at, equipamento
        FROM eventos_empresa
        WHERE company_id::text = $1::text AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz
        ORDER BY created_at DESC
        LIMIT 25
        `,
        [cid, t0, t1]
      );
      for (const row of r.rows || []) {
        evidence.push({ type: 'company_event', source: 'eventos_empresa', row });
      }
    } catch (_ev) {}
  } catch (_db) {}

  let working = evidence.slice();
  if (decisionMachineId) {
    working = filterTemporalAndCausal(working, decisionTsMs, corrWindowMs, decisionMachineId);
  } else {
    working = filterTemporalAndCausal(working, decisionTsMs, corrWindowMs, '');
  }
  const filteredNoise = filterRelevantSignals({ events: working, impact_metrics: impact });
  let scoredEvidence = filteredNoise.length ? filteredNoise : working.slice();
  failScore = 0;
  okScore = 0;
  for (const e of scoredEvidence) {
    const row = e.row || {};
    if (e.type === 'alert') failScore += sevWeight(row.severity);
    else if (e.type === 'task') {
      const st = row.status != null ? String(row.status).toLowerCase() : '';
      if (/fail|cancel|atras|overdue|bloquead/.test(st)) failScore += 2;
      else okScore += 0.5;
    } else if (e.type === 'operational_alert') failScore += sevWeight(row.severidade);
    else if (e.type === 'company_event') {
      const imp = row.impacto != null ? String(row.impacto).toLowerCase() : '';
      if (/alto|high|crit|sever/.test(imp)) failScore += 2;
      else if (/baixo|low|nenh/.test(imp)) okScore += 1;
    }
  }

  let outcome_type = 'neutral';
  let used_heuristic_fallback = false;

  if (scoredEvidence.length === 0) {
    used_heuristic_fallback = true;
    scoredEvidence = [{ type: HEURISTIC, detail: 'no_rows_in_window' }];
    const lat = Number(o.latencyMs);
    if (Number.isFinite(lat) && lat > 12000) outcome_type = 'failure';
    else if (Number.isFinite(lat) && lat > 6500) outcome_type = 'neutral';
    else outcome_type = 'success';
  } else {
    const net = failScore - okScore * 0.4;
    if (net >= 4) {
      outcome_type = 'failure';
      impact.incident_avoided = 0;
      impact.cost_impact = Math.min(1, failScore / 20);
    } else if (net <= -1 && failScore === 0) {
      outcome_type = 'success';
      impact.incident_avoided = Math.min(1, okScore / 6);
    } else {
      outcome_type = 'neutral';
    }
  }

  return {
    outcome_type,
    evidence: scoredEvidence.slice(0, 60),
    impact_metrics: impact,
    used_heuristic_fallback
  };
}

module.exports = {
  correlateDecisionWithOutcome,
  OUTCOME_HEURISTIC_TYPE: HEURISTIC
};
