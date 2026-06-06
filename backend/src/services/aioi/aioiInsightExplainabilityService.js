'use strict';

/**
 * AIOI-P3.1 — Insight Explainability Service (READ ONLY)
 *
 * Drivers determinísticos de sinais executivos — estrutura fixa, sem texto livre/LLM.
 */

const { isValidUUID } = require('../../utils/security');
const expMetrics = require('./aioiExplainabilityMetrics');
const trustReadModel = require('./aioiTrustReadModelService');

function _buildMaturityDrivers(cmd) {
  const op = cmd?.executive_command_state?.operational_state;
  const maturity = cmd?.maturity_read_model?.maturity;
  const drivers = [];
  if (maturity?.score != null) {
    drivers.push(expMetrics.buildDriver('maturity_score', maturity.score));
  }
  if (op?.maturity_level) {
    const levelImpact = { initial: 90, developing: 70, managed: 50, optimized: 30, autonomous_ready: 15 };
    drivers.push(expMetrics.buildDriver('maturity_level', levelImpact[op.maturity_level] ?? 50));
  }
  const consistency = cmd?.maturity_read_model?.governance_consistency?.score;
  if (consistency != null) {
    drivers.push(expMetrics.buildDriver('governance_consistency', 100 - consistency));
  }
  return drivers;
}

function _buildRiskDrivers(cmd) {
  const risk = cmd?.resilience_read_model?.dependency_risk;
  const drivers = [];
  if (risk) {
    const rank = { low: 20, medium: 45, high: 70, critical: 95 };
    for (const [key, val] of Object.entries(risk)) {
      if (key.endsWith('_dependency_risk')) {
        drivers.push(expMetrics.buildDriver(key.replace('_dependency_risk', ''), rank[val] ?? 30));
      }
    }
  }
  const riskImpact = cmd?.value_read_model?.risk_impact;
  if (riskImpact) {
    const rank = { low: 15, medium: 40, high: 65, critical: 90 };
    for (const [key, val] of Object.entries(riskImpact)) {
      if (key.endsWith('_risk_impact')) {
        drivers.push(expMetrics.buildDriver(key.replace('_risk_impact', '_impact'), rank[val] ?? 25));
      }
    }
  }
  return drivers.slice(0, 5);
}

function _buildValueDrivers(cmd) {
  const op = cmd?.executive_command_state?.operational_state;
  const value = op?.operational_value;
  const drivers = [];
  if (value?.operational_value_score != null) {
    drivers.push(expMetrics.buildDriver('operational_value_score', value.operational_value_score));
  }
  const portfolio = cmd?.value_read_model?.portfolio_analysis;
  if (portfolio?.portfolio_balance_score != null) {
    drivers.push(expMetrics.buildDriver('portfolio_balance', portfolio.portfolio_balance_score));
  }
  const alignment = op?.strategic_alignment?.score;
  if (alignment != null) {
    drivers.push(expMetrics.buildDriver('strategic_alignment', alignment));
  }
  return drivers;
}

function _buildResilienceDrivers(cmd) {
  const op = cmd?.executive_command_state?.operational_state;
  const resilience = cmd?.resilience_read_model?.operational_resilience;
  const drivers = [];
  if (resilience?.resilience_score != null) {
    drivers.push(expMetrics.buildDriver('resilience_score', resilience.resilience_score));
  }
  if (op?.resilience_status) {
    const impact = { fragile: 85, resilient: 45, highly_resilient: 20 };
    drivers.push(expMetrics.buildDriver('resilience_status', impact[op.resilience_status] ?? 50));
  }
  const readiness = cmd?.resilience_read_model?.recovery_readiness?.readiness_score;
  if (readiness != null) {
    drivers.push(expMetrics.buildDriver('recovery_readiness', readiness));
  }
  const sustainability = cmd?.resilience_read_model?.sustainability?.sustainability_score;
  if (sustainability != null) {
    drivers.push(expMetrics.buildDriver('sustainability_score', sustainability));
  }
  return drivers;
}

function _buildTrustDrivers(trustModel) {
  const drivers = [];
  const di = trustModel.data_integrity;
  const mc = trustModel.model_consistency;
  const fr = trustModel.forecast_reliability;
  const it = trustModel.intelligence_trust;

  if (di?.integrity_score != null) {
    drivers.push(expMetrics.buildDriver('data_integrity', di.integrity_score));
  }
  if (mc?.consistency_score != null) {
    drivers.push(expMetrics.buildDriver('model_consistency', mc.consistency_score));
  }
  if (fr?.reliability_score != null) {
    drivers.push(expMetrics.buildDriver('forecast_reliability', fr.reliability_score));
  }
  if (it?.trust_score != null) {
    drivers.push(expMetrics.buildDriver('intelligence_trust', it.trust_score));
  }
  return drivers;
}

function computeExplainabilityScore(explainability) {
  const all = [
    ...explainability.maturity_drivers,
    ...explainability.risk_drivers,
    ...explainability.value_drivers,
    ...explainability.resilience_drivers,
    ...explainability.trust_drivers
  ];
  if (!all.length) return 30;
  const avg = all.reduce((s, d) => s + d.impact_score, 0) / all.length;
  return expMetrics.clampScore(avg);
}

function buildInsightExplainability(trustModel) {
  const cmd = trustModel.executive_command_read_model;
  const insight_explainability = {
    maturity_drivers:   _buildMaturityDrivers(cmd),
    risk_drivers:       _buildRiskDrivers(cmd),
    value_drivers:      _buildValueDrivers(cmd),
    resilience_drivers: _buildResilienceDrivers(cmd),
    trust_drivers:      _buildTrustDrivers(trustModel)
  };
  return insight_explainability;
}

async function getInsightExplainability(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const trustRes = await trustReadModel.getTrustReadModel(companyId);
    if (!trustRes.ok) {
      expMetrics.recordError(companyId, 'getInsightExplainability', trustRes.error);
      return { ok: false, error: trustRes.error };
    }

    const insight_explainability = buildInsightExplainability(trustRes.trust_read_model);
    expMetrics.recordExplainabilityAnalyzed(companyId);
    return { ok: true, insight_explainability };

  } catch (err) {
    expMetrics.recordError(companyId, 'getInsightExplainability', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  computeExplainabilityScore,
  buildInsightExplainability,
  getInsightExplainability
};
