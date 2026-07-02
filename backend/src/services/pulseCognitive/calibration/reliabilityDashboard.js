/**
 * CERT-PULSE-04 FASE 9 — Dashboard de confiabilidade (cobertura e qualidade de dados).
 */
'use strict';

const db = require('../../../db');
const { loadCompanyInsights } = require('./calibrationAnalysis');
const calObs = require('./calibrationObservability');

function parseJson(v) {
  if (v == null) return v;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch (_) {
    return v;
  }
}

async function countEligibleMembers(companyId) {
  try {
    const pulseService = require('../../pulseService');
    const r = await db.query(
      `
      SELECT id, role FROM users
      WHERE company_id = $1 AND active = true AND deleted_at IS NULL
        AND COALESCE(is_factory_team_account, false) = false
    `,
      [companyId]
    );
    return (r.rows || []).filter((u) => pulseService.isSubjectToPulse(u.role)).length;
  } catch (_) {
    return 0;
  }
}

async function buildReliabilityDashboard(companyId) {
  const eligible = await countEligibleMembers(companyId);

  let indexed = [];
  try {
    const r = await db.query(
      `
      SELECT i.user_id, i.operational_team_member_id, i.pulse_index, i.confidence,
        i.computed_at, u.name, u.department
      FROM pulse_cognitive_index i
      LEFT JOIN users u ON u.id = i.user_id
      WHERE i.company_id = $1
    `,
      [companyId]
    );
    indexed = r.rows || [];
  } catch (_) {
    return { ok: true, migration_required: true, message: 'Tabelas Pulse Cognitivo não disponíveis.' };
  }

  const indexedCount = indexed.length;
  const coveragePct = eligible > 0 ? Math.round((indexedCount / eligible) * 1000) / 10 : 0;

  const lowConfidence = indexed.filter((r) => (parseFloat(r.confidence) || 0) < 0.45);
  const noRecentCompute = indexed.filter((r) => {
    if (!r.computed_at) return true;
    const age = Date.now() - new Date(r.computed_at).getTime();
    return age > 30 * 86400000;
  });

  const byDept = {};
  for (const row of indexed) {
    const dept = (row.department || 'sem_setor').toLowerCase();
    if (!byDept[dept]) byDept[dept] = { count: 0, confSum: 0, label: row.department || 'Sem setor' };
    byDept[dept].count++;
    byDept[dept].confSum += parseFloat(row.confidence) || 0;
  }
  const sector_coverage = Object.entries(byDept).map(([key, v]) => ({
    sector_key: key,
    sector_label: v.label,
    indexed_members: v.count,
    avg_confidence: v.count ? Math.round((v.confSum / v.count) * 100) / 100 : 0,
    sufficient_data: v.count >= 3
  }));

  const teams_insufficient = sector_coverage.filter((s) => !s.sufficient_data);

  let eventCount = 0;
  try {
    const ev = await db.query(
      `SELECT COUNT(*)::int AS c FROM pulse_cognitive_events WHERE company_id = $1 AND created_at >= now() - interval '30 days'`,
      [companyId]
    );
    eventCount = ev.rows[0]?.c || 0;
  } catch (_) {}

  const insights = await loadCompanyInsights(companyId, 100);
  const withEvidence = insights.filter((i) => i.validation_bundle?.evidence_complete);
  const evidencePct =
    insights.length > 0 ? Math.round((withEvidence.length / insights.length) * 1000) / 10 : 0;

  let validations = { confirmed: 0, partial: 0, rejected: 0 };
  try {
    const v = await db.query(
      `
      SELECT validation_status, COUNT(*)::int AS c
      FROM pulse_cognitive_insight_validation
      WHERE company_id = $1
      GROUP BY validation_status
    `,
      [companyId]
    );
    for (const row of v.rows || []) {
      validations[row.validation_status] = row.c;
    }
  } catch (_) {}

  const avgConfidence =
    indexedCount > 0
      ? Math.round(
          (indexed.reduce((s, r) => s + (parseFloat(r.confidence) || 0), 0) / indexedCount) * 1000
        ) / 1000
      : 0;

  const dataQualityScore = clampScore(
    coveragePct * 0.35 + avgConfidence * 100 * 0.25 + evidencePct * 0.25 + Math.min(eventCount / 50, 1) * 100 * 0.15
  );

  const insufficient_data_warning =
    coveragePct < 40 || lowConfidence.length > indexedCount * 0.5 || evidencePct < 50;

  calObs.recordDataCoverage(coveragePct);
  calObs.recordConfidenceAverage(avgConfidence);

  return {
    ok: true,
    framework: 'pulse_reliability_dashboard',
    cert: 'CERT-PULSE-04',
    data_quality_score: dataQualityScore,
    insufficient_data_warning,
    insufficient_data_message: insufficient_data_warning
      ? 'Dados insuficientes para inferências assertivas — utilize leituras como apoio, não como diagnóstico.'
      : null,
    coverage: {
      eligible_members: eligible,
      indexed_members: indexedCount,
      coverage_percent: coveragePct,
      events_last_30_days: eventCount
    },
    confidence: {
      average: avgConfidence,
      low_confidence_members: lowConfidence.slice(0, 20).map((r) => ({
        user_id: r.user_id,
        name: r.name,
        confidence: r.confidence,
        pulse_index: r.pulse_index
      })),
      stale_index_members: noRecentCompute.length
    },
    sector_coverage,
    teams_without_sufficient_data: teams_insufficient,
    insights_quality: {
      total: insights.length,
      with_complete_evidence: withEvidence.length,
      evidence_complete_percent: evidencePct
    },
    human_validations: validations,
    governance: {
      assistive_only: true,
      human_in_the_loop: true,
      say_insufficient_when: insufficient_data_warning
    }
  };
}

function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

module.exports = { buildReliabilityDashboard };
