'use strict';

/**
 * AIOI-P2.5 — Risk Impact Analysis Service (READ ONLY)
 *
 * Combina riscos P2.1 e forecasts P2.2 em impacto executivo determinístico.
 */

const { isValidUUID } = require('../../utils/security');
const valueMetrics = require('./aioiValueMetrics');
const riskService = require('./aioiRiskAnalysisService');
const riskForecastService = require('./aioiRiskForecastService');

/**
 * Regras determinísticas:
 *   rank = max(current, forecast)
 *   se current=high E forecast=high → critical
 */
function classifyRiskImpact(currentRisk, forecastRisk) {
  const cur = valueMetrics.riskRank(currentRisk);
  const fc = valueMetrics.riskRank(forecastRisk);
  const max = Math.max(cur, fc);
  if (cur >= 3 && fc >= 3) return 'critical';
  if (max >= 3) return 'high';
  if (max >= 2) return 'medium';
  return 'low';
}

function buildRiskImpactFromSignals(riskAnalysis, riskForecast) {
  const dims = ['approval', 'execution', 'outcome', 'learning'];
  const result = {};
  for (const dim of dims) {
    result[`${dim}_risk_impact`] = classifyRiskImpact(
      riskAnalysis[`${dim}_risk`],
      riskForecast[`${dim}_risk_forecast`]
    );
  }
  return result;
}

async function getRiskImpact(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [riskRes, forecastRes] = await Promise.all([
      riskService.getRiskAnalysis(companyId),
      riskForecastService.getExecutiveRiskForecast(companyId)
    ]);

    if (!riskRes.ok || !forecastRes.ok) {
      const err = riskRes.error || forecastRes.error;
      valueMetrics.recordError(companyId, 'getRiskImpact', err);
      return { ok: false, error: err };
    }

    const risk_impact = buildRiskImpactFromSignals(riskRes.risk_analysis, forecastRes.risk_forecast);
    valueMetrics.recordRiskImpactAnalyzed(companyId);
    return { ok: true, risk_impact };

  } catch (err) {
    valueMetrics.recordError(companyId, 'getRiskImpact', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  classifyRiskImpact,
  buildRiskImpactFromSignals,
  getRiskImpact
};
