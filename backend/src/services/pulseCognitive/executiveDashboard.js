/**
 * CERT-PULSE-03 FASE 6 — Dashboard executivo integrado (estados multi-domínio).
 */
'use strict';

const { analyzeCrossDomain } = require('./crossDomainCorrelation');
const { analyzeTemporalLearning } = require('./temporalLearning');

async function loadCompanyState(companyId) {
  try {
    const db = require('../../db');
    const r = await db.query(
      `SELECT * FROM pulse_cognitive_state WHERE company_id = $1 AND scope_type = 'company' AND scope_key = 'all'`,
      [companyId]
    );
    return r.rows[0] || null;
  } catch (_) {
    return null;
  }
}

async function buildExecutiveDashboard(companyId, baseDashboard) {
  const started = Date.now();
  const [crossDomain, temporal, companyState] = await Promise.all([
    analyzeCrossDomain(companyId),
    analyzeTemporalLearning(companyId, {}),
    loadCompanyState(companyId)
  ]);

  const signals = crossDomain.signals || {};
  const hr = signals.human?.hr_indicators || {};

  const domain_states = {
    human: {
      label: 'Estado Humano (Pulse)',
      pulse_index: baseDashboard?.company_pulse?.pulse_index ?? signals.human?.pulse_index_avg,
      state: companyState?.state_label || baseDashboard?.company_pulse?.organizational_state,
      confidence: companyState?.confidence
    },
    operational: {
      label: 'Estado Operacional',
      tpm_activity: signals.operation?.tpm_count,
      open_tasks: signals.operation?.open_tasks,
      proposals: signals.operation?.proposals_count,
      proxy_health: signals.operation?.tpm_count >= 2 ? 'active' : 'low_signal'
    },
    maintenance: {
      label: 'Estado da Manutenção',
      tpm_registrations: signals.maintenance_proxy?.tpm_activity,
      proxy: 'via TPM / ManuIA'
    },
    quality: {
      label: 'Estado da Qualidade',
      alerts: signals.quality_sst?.operational_alerts,
      proxy_health: signals.quality_sst?.operational_alerts <= 3 ? 'stable' : 'elevated'
    },
    sst: {
      label: 'Estado SST',
      alerts: signals.quality_sst?.operational_alerts,
      fatigue_risk: hr.fatigue_risk_index
    },
    logistics: {
      label: 'Estado Logístico',
      proxy: 'sinais operacionais agregados',
      open_tasks: signals.operation?.open_tasks
    },
    digital_twin: {
      label: 'Gêmeo Digital (proxy)',
      operational: signals.digital_twin_proxy
    }
  };

  return {
    ok: true,
    framework: 'pulse_cognitive_executive',
    domain_states,
    cross_domain_insights: crossDomain.cross_domain_insights || [],
    temporal_learning: temporal,
    correlations_matrix: (crossDomain.cross_domain_insights || []).map((i) => ({
      title: i.title,
      domains: i.domains,
      confidence: i.confidence
    })),
    governance: crossDomain.governance,
    duration_ms: Date.now() - started
  };
}

module.exports = { buildExecutiveDashboard };
