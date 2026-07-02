/**
 * CERT-PULSE-03 FASE 3 — Aprendizado temporal (evolução individual, equipe, setor, empresa).
 */
'use strict';

const db = require('../../db');

function classifyTrend(points) {
  if (!points || points.length < 2) return { code: 'insufficient_data', label: 'Dados insuficientes', confidence: 0.35 };

  const values = points.map((p) => parseFloat(p.pulse_index ?? p.avg_index)).filter((v) => !Number.isNaN(v));
  if (values.length < 2) return { code: 'insufficient_data', label: 'Dados insuficientes', confidence: 0.35 };

  const first = values.slice(0, Math.ceil(values.length / 3));
  const last = values.slice(-Math.ceil(values.length / 3));
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const early = avg(first);
  const recent = avg(last);
  const delta = recent - early;

  const variance =
    values.reduce((s, v) => s + (v - avg(values)) ** 2, 0) / Math.max(values.length - 1, 1);
  const std = Math.sqrt(variance);

  if (Math.abs(delta) < 3 && std < 8) {
    return { code: 'stable', label: 'Estabilidade', confidence: 0.72, delta, std };
  }
  if (delta >= 8) {
    return { code: 'consistent_improvement', label: 'Melhora consistente', confidence: 0.68, delta, std };
  }
  if (delta <= -8) {
    return { code: 'consistent_decline', label: 'Queda consistente', confidence: 0.68, delta, std };
  }
  if (std >= 15) {
    return { code: 'oscillation', label: 'Oscilação', confidence: 0.6, delta, std };
  }

  const lastJump = values[values.length - 1] - values[values.length - 2];
  if (Math.abs(lastJump) >= 12) {
    return {
      code: 'abrupt_change',
      label: lastJump > 0 ? 'Mudança abrupta positiva' : 'Mudança abrupta negativa',
      confidence: 0.58,
      delta,
      std,
      last_jump: lastJump
    };
  }

  if (delta > 0) return { code: 'mild_improvement', label: 'Melhora gradual', confidence: 0.55, delta, std };
  if (delta < 0) return { code: 'mild_decline', label: 'Queda gradual', confidence: 0.55, delta, std };
  return { code: 'stable', label: 'Estável', confidence: 0.5, delta, std };
}

async function loadHistorySeries(companyId, scope = {}) {
  const { userId, teamMemberId, days = 90 } = scope;
  const params = [companyId, days];
  let sql = `
    SELECT recorded_at, pulse_index, dimensions, organizational_state
    FROM pulse_cognitive_index_history
    WHERE company_id = $1 AND recorded_at >= now() - ($2::int || ' days')::interval
  `;
  if (userId) {
    params.push(userId);
    sql += ` AND user_id = $${params.length}`;
  } else if (teamMemberId) {
    params.push(teamMemberId);
    sql += ` AND operational_team_member_id = $${params.length}`;
  }
  sql += ` ORDER BY recorded_at ASC`;
  try {
    const r = await db.query(sql, params);
    return r.rows || [];
  } catch (_) {
    return [];
  }
}

async function analyzeTemporalLearning(companyId, scope = {}) {
  const individual = await loadHistorySeries(companyId, scope);
  const individualTrend = classifyTrend(individual);

  let companyTrend = null;
  try {
    const r = await db.query(
      `
      SELECT date_trunc('day', recorded_at) AS day, AVG(pulse_index)::numeric(5,2) AS avg_index
      FROM pulse_cognitive_index_history
      WHERE company_id = $1 AND recorded_at >= now() - interval '90 days'
      GROUP BY 1 ORDER BY 1
    `,
      [companyId]
    );
    companyTrend = classifyTrend(r.rows || []);
  } catch (_) {
    companyTrend = { code: 'unknown', label: '—', confidence: 0.3 };
  }

  return {
    individual: { points: individual.length, trend: individualTrend },
    company: { trend: companyTrend },
    assistive_only: true,
    human_in_the_loop: true
  };
}

module.exports = { classifyTrend, analyzeTemporalLearning, loadHistorySeries };
