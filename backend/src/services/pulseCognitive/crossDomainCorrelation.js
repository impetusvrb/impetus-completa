/**
 * CERT-PULSE-03 FASE 4 — Correlação interdomínios (Pulse × Operação × Qualidade × SST × Manutenção).
 */
'use strict';

const db = require('../../db');

async function safeCount(sql, params) {
  try {
    const r = await db.query(sql, params);
    return parseInt(r.rows?.[0]?.c ?? 0, 10);
  } catch (_) {
    return 0;
  }
}

async function loadDomainSignals(companyId, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [tpm, proposals, alerts, pulseAvg, tasksOpen] = await Promise.all([
    safeCount(
      `SELECT COUNT(*)::int AS c FROM tpm_incidents WHERE company_id = $1 AND incident_date >= $2::date`,
      [companyId, since.slice(0, 10)]
    ),
    safeCount(
      `SELECT COUNT(*)::int AS c FROM proposals WHERE company_id = $1 AND created_at >= $2::timestamptz`,
      [companyId, since]
    ),
    safeCount(
      `SELECT COUNT(*)::int AS c FROM operational_alerts WHERE company_id = $1 AND created_at >= $2::timestamptz`,
      [companyId, since]
    ),
    db
      .query(
        `SELECT AVG(pulse_index)::numeric(5,2) AS avg FROM pulse_cognitive_index WHERE company_id = $1`,
        [companyId]
      )
      .then((r) => parseFloat(r.rows[0]?.avg) || null)
      .catch(() => null),
    safeCount(
      `SELECT COUNT(*)::int AS c FROM tasks WHERE company_id = $1 AND COALESCE(status,'open') NOT IN ('done','completed','closed')`,
      [companyId]
    )
  ]);

  let hrIndicators = null;
  try {
    const hr = require('../hrIntelligenceService');
    hrIndicators = await hr.getIndicators(companyId, days);
  } catch (_) {
    hrIndicators = null;
  }

  let digitalTwinProxy = null;
  try {
    const { loadHrTenantSignals } = require('../../cognitiveRuntime/domains/hr/bridge/hrTenantSignalLoader');
    const sig = await loadHrTenantSignals({ company_id: companyId });
    digitalTwinProxy = sig?.operational || null;
  } catch (_) {
    digitalTwinProxy = null;
  }

  return {
    human: { pulse_index_avg: pulseAvg, hr_indicators: hrIndicators },
    operation: { tpm_count: tpm, proposals_count: proposals, open_tasks: tasksOpen },
    quality_sst: { operational_alerts: alerts },
    maintenance_proxy: { tpm_activity: tpm },
    digital_twin_proxy: digitalTwinProxy,
    period_days: days
  };
}

function correlateDomains(signals, pulseIndex = null) {
  const insights = [];
  const hr = signals.human?.hr_indicators || {};
  const absence = parseFloat(hr.absence_index) || 0;
  const fatigue = parseFloat(hr.fatigue_risk_index) || 0;
  const tpm = signals.operation?.tpm_count || 0;
  const prop = signals.operation?.proposals_count || 0;
  const alerts = signals.quality_sst?.operational_alerts || 0;
  const pulse = pulseIndex ?? signals.human?.pulse_index_avg;

  if (pulse != null && pulse < 50 && alerts >= 5 && prop < 3) {
    insights.push({
      code: 'climate_operational_stress',
      title: 'Queda de clima com pressão operacional',
      summary:
        'Pulse Index abaixo da referência com alertas operacionais elevados e poucas melhorias registradas. Leitura assistiva — validar com RH e operações.',
      domains: ['pulse', 'qualidade', 'sst', 'operacao'],
      confidence: 0.64,
      evidence: { pulse_index: pulse, alerts, proposals: prop }
    });
  }

  if (prop >= 5 && tpm >= 3 && alerts <= 2) {
    insights.push({
      code: 'positive_operational_culture',
      title: 'Alta participação com ambiente mais estável',
      summary:
        'Volume de melhorias e TPM com poucos alertas críticos — possível boa prática organizacional.',
      domains: ['pulse', 'proacao', 'tpm', 'sst'],
      confidence: 0.62,
      evidence: { proposals: prop, tpm, alerts }
    });
  }

  if (absence > 8 && fatigue > 40 && (pulse == null || pulse < 55)) {
    insights.push({
      code: 'hr_operational_fatigue_cluster',
      title: 'Fadiga e absenteísmo correlacionados',
      domains: ['pulse', 'rh', 'operacao'],
      summary: 'Indicadores de RH sugerem sobrecarga; cruzar com Pulse e turnos.',
      confidence: 0.66,
      evidence: { absence_index: absence, fatigue_risk: fatigue, pulse_index: pulse }
    });
  }

  return {
    signals,
    cross_domain_insights: insights,
    governance: { assistive_only: true, human_in_the_loop: true }
  };
}

async function analyzeCrossDomain(companyId) {
  const signals = await loadDomainSignals(companyId);
  return correlateDomains(signals);
}

module.exports = { loadDomainSignals, correlateDomains, analyzeCrossDomain };
