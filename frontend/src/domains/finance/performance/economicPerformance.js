/**
 * FIN-EVOLVE-2.1 — Economic Performance (no AI, no forecast).
 * Indicators from registered cost + leakage + smart costing composition.
 */
import { roundMoney, num, traceStep } from '../calculators/economicCalcUtils.js';
import { FIN_EVOLVE_21_PHASE } from '../contracts/economicEngineContracts.js';

/**
 * @param {object} context — normalized industrial + leakage
 * @param {object} smartCosting — output of runSmartCosting
 */
export function runEconomicPerformance(context = {}, smartCosting = {}) {
  const n = context.normalized || {};
  const realCost = n.perDay;
  const expected =
    n.perMonth != null
      ? roundMoney(n.perMonth / 30)
      : realCost != null
        ? realCost
        : null;

  const variance =
    realCost != null && expected != null ? roundMoney(realCost - expected) : null;
  const efficiency =
    realCost != null && expected != null && expected !== 0
      ? roundMoney((expected / realCost) * 100, 2)
      : null;

  const economicLosses = roundMoney(
    num(n.topLossAmount, 0) + num(n.leakageProjected, 0) + num(n.impactLastDay, 0)
  );

  const consolidated =
    realCost != null
      ? roundMoney(realCost + num(n.impactLastDay, 0))
      : smartCosting.driverContributions?.total != null
        ? roundMoney(smartCosting.driverContributions.total)
        : null;

  return Object.freeze({
    phase: FIN_EVOLVE_21_PHASE,
    capability: 'economic_performance',
    explainable: true,
    indicators: Object.freeze({
      costReal: Object.freeze({
        id: 'cost_real',
        label: 'Custo real (dia)',
        value: realCost,
        currency: 'BRL',
        evidence: 'dashboard.costs · operational.per_day'
      }),
      costExpected: Object.freeze({
        id: 'cost_expected',
        label: 'Custo esperado (baseline dia)',
        value: expected,
        currency: 'BRL',
        evidence: n.perMonth != null ? 'per_month/30' : 'baseline=real (sem mês)'
      }),
      costVariance: Object.freeze({
        id: 'cost_real_vs_expected',
        label: 'Custo real × esperado (Δ)',
        value: variance,
        currency: 'BRL',
        evidence: 'real − expected'
      }),
      economicEfficiency: Object.freeze({
        id: 'economic_efficiency',
        label: 'Eficiência económica',
        value: efficiency,
        unit: '%',
        evidence: '(expected / real) × 100'
      }),
      economicLosses: Object.freeze({
        id: 'economic_losses',
        label: 'Perdas económicas',
        value: economicLosses,
        currency: 'BRL',
        evidence: 'top_loss + leakage_projected + impact_24h'
      }),
      consolidatedOperationalCost: Object.freeze({
        id: 'consolidated_operational_cost',
        label: 'Custo operacional consolidado',
        value: consolidated,
        currency: 'BRL',
        evidence: 'operational.per_day + impact_24h (contracts)'
      })
    }),
    contractsUsed: Object.freeze(['dashboard.costs', 'dashboard.financialLeakage', 'finance.driver_rate.v1']),
    trace: Object.freeze([
      traceStep('performance_complete', {
        realCost,
        expected,
        variance,
        efficiency,
        economicLosses,
        consolidated
      })
    ])
  });
}

export function validateEconomicPerformance(result) {
  const issues = [];
  if (!result || result.capability !== 'economic_performance') {
    issues.push('missing economic_performance');
  }
  const ids = Object.keys(result?.indicators || {});
  for (const k of [
    'costReal',
    'costExpected',
    'costVariance',
    'economicEfficiency',
    'economicLosses',
    'consolidatedOperationalCost'
  ]) {
    if (!ids.includes(k)) issues.push(`missing indicator ${k}`);
  }
  return { valid: issues.length === 0, issues };
}
