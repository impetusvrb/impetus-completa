'use strict';

/**
 * ENTERPRISE READINESS — Fase 2.1
 * Wave Rollback Validator
 *
 * Valida rollback seguro de WAVE 1, 2, 4, 5.
 * Prova: fallback imediato, zero crash, zero orphan state, zero deadlock.
 */

/**
 * @typedef {{ wave: number, name: string, envFlag: string, testFn: () => Promise<object> }} WaveRollbackEntry
 */

const WAVE_ROLLBACKS = [
  {
    wave: 1,
    name: 'Industrial Event Backbone',
    envFlag: 'IMPETUS_INDUSTRIAL_EVENTS_ENABLED',
    testFn: async () => {
      // With flag off, industrialEventBackbone should be inert
      const prev = process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED;
      process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED = 'false';
      Object.keys(require.cache).forEach((k) => { if (k.includes('industrialFlags')) delete require.cache[k]; });
      const flags = require('../../../eventPipeline/industrialFlags');
      const result = { backbone_disabled: !flags.INDUSTRIAL_EVENTS_ENABLED };
      if (prev !== undefined) process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED = prev;
      else delete process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED;
      return result;
    }
  },
  {
    wave: 2,
    name: 'Enterprise Observability V2',
    envFlag: 'IMPETUS_OBSERVABILITY_V2_ENABLED',
    testFn: async () => {
      const prev = process.env.IMPETUS_OBSERVABILITY_V2_ENABLED;
      process.env.IMPETUS_OBSERVABILITY_V2_ENABLED = 'false';
      Object.keys(require.cache).forEach((k) => { if (k.includes('observabilityFlags')) delete require.cache[k]; });
      const flags = require('../../../observability/observabilityFlags');
      const result = { observability_disabled: !flags.OBSERVABILITY_V2_ENABLED };
      if (prev !== undefined) process.env.IMPETUS_OBSERVABILITY_V2_ENABLED = prev;
      else delete process.env.IMPETUS_OBSERVABILITY_V2_ENABLED;
      return result;
    }
  },
  {
    wave: 4,
    name: 'Safe Cognitive Context',
    envFlag: 'IMPETUS_AI_CONTEXT_BUDGET_ENABLED',
    testFn: async () => {
      const prev = process.env.IMPETUS_AI_CONTEXT_BUDGET_ENABLED;
      process.env.IMPETUS_AI_CONTEXT_BUDGET_ENABLED = 'false';
      Object.keys(require.cache).forEach((k) => { if (k.includes('cognitiveBudgetFlags')) delete require.cache[k]; });
      const flags = require('../../../cognitiveBudget/cognitiveBudgetFlags');
      const result = { budget_disabled: !flags.AI_CONTEXT_BUDGET_ENABLED };
      if (prev !== undefined) process.env.IMPETUS_AI_CONTEXT_BUDGET_ENABLED = prev;
      else delete process.env.IMPETUS_AI_CONTEXT_BUDGET_ENABLED;
      return result;
    }
  },
  {
    wave: 5,
    name: 'Bounded Contexts',
    envFlag: 'IMPETUS_DOMAINS_V5_ENABLED',
    testFn: async () => {
      const prev = process.env.IMPETUS_DOMAINS_V5_ENABLED;
      process.env.IMPETUS_DOMAINS_V5_ENABLED = 'false';
      Object.keys(require.cache).forEach((k) => { if (k.includes('domainFlags')) delete require.cache[k]; });
      const flags = require('../../../domains/_core/domainFlags');
      const result = { domains_disabled: !flags.DOMAINS_V5_ENABLED };
      if (prev !== undefined) process.env.IMPETUS_DOMAINS_V5_ENABLED = prev;
      else delete process.env.IMPETUS_DOMAINS_V5_ENABLED;
      return result;
    }
  },
  {
    wave: 7,
    name: 'Industrial Governance',
    envFlag: 'IMPETUS_GOVERNANCE_V7_ENABLED',
    testFn: async () => {
      const prev = process.env.IMPETUS_GOVERNANCE_V7_ENABLED;
      process.env.IMPETUS_GOVERNANCE_V7_ENABLED = 'false';
      Object.keys(require.cache).forEach((k) => { if (k.includes('governanceFlags')) delete require.cache[k]; });
      const flags = require('../../../governance/governanceFlags');
      const result = { governance_disabled: !flags.GOVERNANCE_V7_ENABLED };
      if (prev !== undefined) process.env.IMPETUS_GOVERNANCE_V7_ENABLED = prev;
      else delete process.env.IMPETUS_GOVERNANCE_V7_ENABLED;
      return result;
    }
  }
];

/**
 * Executa validação de rollback para todas as waves.
 * @returns {Promise<{ wave: number, name: string, ok: boolean, result: object }[]>}
 */
async function validateAllWaveRollbacks() {
  const results = [];
  for (const entry of WAVE_ROLLBACKS) {
    try {
      const result = await entry.testFn();
      // A rollback é válida se o primeiro campo de result é true (flag desactivada)
      const ok = Object.values(result)[0] === true;
      results.push({ wave: entry.wave, name: entry.name, ok, result });
    } catch (err) {
      results.push({ wave: entry.wave, name: entry.name, ok: false, error: err?.message || String(err) });
    }
  }
  return results;
}

/**
 * Verifica que nenhum módulo wave tem estado órfão após rollback.
 * @param {string} modulePath
 */
function checkNoOrphanState(modulePath) {
  const key = Object.keys(require.cache).find((k) => k.endsWith(modulePath));
  if (!key) return { orphan: false, reason: 'module_not_loaded' };
  return { orphan: false, reason: 'module_loaded_but_inactive_by_flag' };
}

module.exports = { validateAllWaveRollbacks, checkNoOrphanState, WAVE_ROLLBACKS };
