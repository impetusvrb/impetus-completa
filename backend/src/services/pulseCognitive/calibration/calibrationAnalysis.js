/**
 * CERT-PULSE-04 FASES 3–7 — Análise de inferências, falsos positivos/negativos,
 * consistência temporal e alinhamento com eventos reais.
 */
'use strict';

const db = require('../../../db');
const { analyzeTemporalLearning } = require('../temporalLearning');
const { loadDomainSignals } = require('../crossDomainCorrelation');
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

function enrichInsightEvidence(insight) {
  const indicators = parseJson(insight.indicators_used) || [];
  const evidence = parseJson(insight.evidence) || [];
  const correlations = parseJson(insight.correlations) || [];
  const confidence = parseFloat(insight.confidence) || 0.35;
  const hasSignals = indicators.length > 0 || evidence.length > 0;
  const evidenceComplete = hasSignals && confidence >= 0.35;

  return {
    id: insight.id,
    insight_type: insight.insight_type,
    title: insight.title,
    summary: insight.summary,
    confidence,
    created_at: insight.created_at,
    validation_bundle: {
      signals_used: indicators,
      rules_used: extractRules(insight),
      correlations_used: correlations,
      confidence,
      hypothesis: insight.summary,
      justification: evidence,
      evidence_complete: evidenceComplete,
      emit_allowed: evidenceComplete
    },
    governance: { assistive_only: true, human_in_the_loop: true }
  };
}

function extractRules(insight) {
  const rules = [];
  if (insight.insight_type === 'pattern') {
    rules.push({ rule: 'pattern_detection', source: 'humanCorrelationEngine' });
  }
  if (insight.insight_type === 'organizational_state') {
    rules.push({ rule: 'state_inference', source: 'stateEngine' });
  }
  if (insight.insight_type === 'cross_domain') {
    rules.push({ rule: 'cross_domain_correlation', source: 'crossDomainCorrelation' });
  }
  return rules.length ? rules : [{ rule: 'cognitive_motor', source: 'cognitiveMotor' }];
}

async function loadCompanyInsights(companyId, limit = 50) {
  try {
    const r = await db.query(
      `
      SELECT * FROM pulse_cognitive_insights
      WHERE company_id = $1
      ORDER BY created_at DESC LIMIT $2
    `,
      [companyId, limit]
    );
    return (r.rows || []).map(enrichInsightEvidence);
  } catch (_) {
    return [];
  }
}

async function analyzeFalsePositives(companyId) {
  const occurrences = [];

  try {
    const patterns = await db.query(
      `
      SELECT p.*, i.pulse_index, i.confidence AS idx_confidence
      FROM pulse_cognitive_patterns p
      LEFT JOIN pulse_cognitive_index i ON i.company_id = p.company_id
        AND (i.user_id::text = p.scope_key OR i.operational_team_member_id::text = p.scope_key)
      WHERE p.company_id = $1 AND p.severity IN ('elevated', 'critical')
        AND (p.expires_at IS NULL OR p.expires_at > now())
    `,
      [companyId]
    );

    for (const row of patterns.rows || []) {
      const signals = parseJson(row.signals) || [];
      const conf = parseFloat(row.confidence) || 0;
      const idx = parseFloat(row.pulse_index);

      if (conf >= 0.6 && signals.length < 2) {
        occurrences.push({
          code: 'high_risk_low_evidence',
          classification: 'false_positive_candidate',
          pattern: row.pattern_label,
          severity: row.severity,
          confidence: conf,
          signal_count: signals.length,
          note: 'Alerta elevado com poucos sinais correlacionados'
        });
      }
      if (idx >= 70 && row.pattern_code === 'disengagement_risk') {
        occurrences.push({
          code: 'healthy_index_risk_pattern',
          classification: 'false_positive_candidate',
          pattern: row.pattern_label,
          pulse_index: idx,
          note: 'Padrão de desengajamento com índice global elevado'
        });
      }
    }
  } catch (_) {}

  try {
    const states = await db.query(
      `
      SELECT scope_key, state_code, confidence, evidence
      FROM pulse_cognitive_state
      WHERE company_id = $1 AND state_code = 'at_risk_team'
    `,
      [companyId]
    );
    for (const row of states.rows || []) {
      const evidence = parseJson(row.evidence) || [];
      if (evidence.length === 0) {
        occurrences.push({
          code: 'at_risk_without_evidence',
          classification: 'false_positive_candidate',
          scope: row.scope_key,
          note: 'Estado em risco sem evidências explícitas registradas'
        });
      }
    }
  } catch (_) {}

  try {
    const recurring = await db.query(
      `
      SELECT pattern_code, pattern_label, COUNT(*)::int AS c
      FROM pulse_cognitive_patterns
      WHERE company_id = $1 AND detected_at >= now() - interval '60 days'
      GROUP BY pattern_code, pattern_label
      HAVING COUNT(*) >= 4
    `,
      [companyId]
    );
    for (const row of recurring.rows || []) {
      occurrences.push({
        code: 'recurring_alert',
        classification: 'watch',
        pattern: row.pattern_label,
        occurrences: row.c,
        note: 'Alerta recorrente — validar fundamento com RH'
      });
    }
  } catch (_) {}

  if (occurrences.length) calObs.recordFalsePositiveCandidate(occurrences.length);

  return {
    ok: true,
    company_id: companyId,
    false_positive_candidates: occurrences,
    count: occurrences.length,
    governance: { assistive_only: true, human_review_required: true }
  };
}

async function analyzeFalseNegatives(companyId) {
  const occurrences = [];
  const days = 60;

  let signals;
  try {
    signals = await loadDomainSignals(companyId, days);
  } catch (_) {
    signals = null;
  }

  let companyPulse = null;
  try {
    const r = await db.query(
      `SELECT pulse_index, organizational_state, confidence FROM pulse_cognitive_aggregate_index
       WHERE company_id = $1 AND scope_type = 'company' AND scope_key = 'all'`,
      [companyId]
    );
    companyPulse = r.rows[0] || null;
  } catch (_) {}

  const alerts = signals?.quality_sst?.operational_alerts || 0;
  const absence = parseFloat(signals?.human?.hr_indicators?.absence_index) || 0;
  const pulseIdx = parseFloat(companyPulse?.pulse_index) || null;
  const state = companyPulse?.organizational_state;

  if (alerts >= 8 && pulseIdx != null && pulseIdx >= 60 && state === 'stable_team') {
    occurrences.push({
      code: 'operational_alerts_stable_pulse',
      classification: 'false_negative_candidate',
      alerts,
      pulse_index: pulseIdx,
      note: 'Muitos alertas operacionais com Pulse estável'
    });
  }

  if (absence > 12 && pulseIdx != null && pulseIdx >= 55) {
    occurrences.push({
      code: 'high_absence_stable_pulse',
      classification: 'false_negative_candidate',
      absence_index: absence,
      pulse_index: pulseIdx,
      note: 'Absenteísmo elevado sem deterioração perceptível do índice'
    });
  }

  try {
    const events = await db.query(
      `
      SELECT event_type, COUNT(*)::int AS c
      FROM pulse_cognitive_events
      WHERE company_id = $1 AND created_at >= now() - ($2::int || ' days')::interval
        AND event_type IN ('sst_incident', 'near_miss', 'quality_event')
      GROUP BY event_type
    `,
      [companyId, days]
    );
    const incidentCount = (events.rows || []).reduce((s, e) => s + e.c, 0);
    if (incidentCount >= 3 && pulseIdx != null && pulseIdx >= 58) {
      occurrences.push({
        code: 'sst_quality_events_stable_pulse',
        classification: 'false_negative_candidate',
        incident_events: incidentCount,
        pulse_index: pulseIdx,
        note: 'Incidentes SST/qualidade sem queda correspondente do Pulse'
      });
    }
  } catch (_) {}

  if (occurrences.length) calObs.recordFalseNegativeCandidate(occurrences.length);

  return {
    ok: true,
    company_id: companyId,
    false_negative_candidates: occurrences,
    count: occurrences.length,
    governance: { assistive_only: true, human_review_required: true }
  };
}

async function checkTemporalConsistency(companyId) {
  const issues = [];
  const checks = [];

  const temporal = await analyzeTemporalLearning(companyId, {});
  checks.push({
    scope: 'company',
    trend: temporal.company?.trend,
    status: temporal.company?.trend?.code === 'oscillation' ? 'review' : 'ok'
  });

  try {
    const events = await db.query(
      `
      SELECT event_type, date_trunc('week', created_at) AS week, COUNT(*)::int AS c
      FROM pulse_cognitive_events
      WHERE company_id = $1 AND created_at >= now() - interval '90 days'
        AND event_type IN ('training_completed', 'recognition', 'proacao_submitted', 'tpm_recorded')
      GROUP BY 1, 2 ORDER BY 2
    `,
      [companyId]
    );

    const hist = await db.query(
      `
      SELECT date_trunc('week', recorded_at) AS week, AVG(pulse_index)::numeric(5,2) AS avg
      FROM pulse_cognitive_index_history
      WHERE company_id = $1 AND recorded_at >= now() - interval '90 days'
      GROUP BY 1 ORDER BY 1
    `,
      [companyId]
    );

    const eventWeeks = new Set((events.rows || []).map((e) => String(e.week)));
    const pulseSeries = hist.rows || [];

    for (let i = 1; i < pulseSeries.length; i++) {
      const jump = Math.abs(parseFloat(pulseSeries[i].avg) - parseFloat(pulseSeries[i - 1].avg));
      const week = String(pulseSeries[i].week);
      if (jump >= 15 && !eventWeeks.has(week)) {
        issues.push({
          code: 'abrupt_pulse_without_events',
          week,
          jump,
          classification: 'temporal_inconsistency',
          note: 'Oscilação abrupta do índice sem eventos correlacionados na mesma semana'
        });
      }
    }

    checks.push({
      scope: 'event_pulse_alignment',
      event_weeks: eventWeeks.size,
      pulse_weeks: pulseSeries.length,
      issues_found: issues.length
    });
  } catch (_) {}

  return {
    ok: true,
    company_id: companyId,
    temporal_checks: checks,
    inconsistencies: issues,
    governance: { assistive_only: true }
  };
}

async function compareWithRealEvents(companyId) {
  const days = 90;
  const signals = await loadDomainSignals(companyId, 30).catch(() => ({}));

  let pulseHistory = [];
  try {
    const r = await db.query(
      `
      SELECT date_trunc('week', recorded_at) AS week, AVG(pulse_index)::numeric(5,2) AS avg_index
      FROM pulse_cognitive_index_history
      WHERE company_id = $1 AND recorded_at >= now() - ($2::int || ' days')::interval
      GROUP BY 1 ORDER BY 1
    `,
      [companyId, days]
    );
    pulseHistory = r.rows || [];
  } catch (_) {}

  const domains = {
    absenteeism: {
      proxy: signals?.human?.hr_indicators?.absence_index ?? null,
      module: 'rh'
    },
    accidents_alerts: {
      proxy: signals?.quality_sst?.operational_alerts ?? 0,
      module: 'sst'
    },
    rework_quality: {
      proxy: signals?.quality_sst?.operational_alerts ?? 0,
      module: 'qualidade'
    },
    productivity: {
      proxy: signals?.operation?.tpm_count ?? 0,
      module: 'tpm'
    },
    proacao: {
      proxy: signals?.operation?.proposals_count ?? 0,
      module: 'proacao'
    },
    tpm: {
      proxy: signals?.operation?.tpm_count ?? 0,
      module: 'tpm'
    },
    training: {
      proxy: null,
      module: 'treinamento'
    },
    recognition: {
      proxy: null,
      module: 'rh'
    }
  };

  const alignments = [];
  const avgPulse =
    pulseHistory.length > 0
      ? pulseHistory.reduce((s, p) => s + parseFloat(p.avg_index), 0) / pulseHistory.length
      : null;

  if (domains.proacao.proxy >= 5 && avgPulse != null && avgPulse < 50) {
    alignments.push({
      code: 'high_proacao_low_pulse',
      alignment: 'divergent',
      note: 'Alta participação em melhorias sem reflexo proporcional no Pulse'
    });
  }
  if (domains.absenteeism.proxy > 10 && avgPulse != null && avgPulse >= 65) {
    alignments.push({
      code: 'absence_pulse_gap',
      alignment: 'divergent',
      note: 'Absenteísmo elevado com Pulse médio alto'
    });
  }
  if (domains.tpm.proxy >= 3 && domains.proacao.proxy >= 3 && avgPulse != null && avgPulse >= 60) {
    alignments.push({
      code: 'positive_operational_alignment',
      alignment: 'aligned',
      note: 'TPM e Pró-Ação consistentes com Pulse saudável'
    });
  }

  return {
    ok: true,
    company_id: companyId,
    period_days: days,
    domain_signals: domains,
    pulse_weekly_avg: avgPulse,
    alignments,
    pulse_history_weeks: pulseHistory.length,
    governance: { assistive_only: true }
  };
}

module.exports = {
  enrichInsightEvidence,
  loadCompanyInsights,
  analyzeFalsePositives,
  analyzeFalseNegatives,
  checkTemporalConsistency,
  compareWithRealEvents
};
