'use strict';

/**
 * WAVE 4 — runtime orquestrador de contexto cognitivo seguro.
 */

const flags = require('./cognitiveBudgetFlags');
const budget = require('./aiContextBudgetService');
const tokenGov = require('./tokenGovernanceService');
const autoloop = require('./aiAutoloopGuard');
const quotas = require('./contextQuotaRegistry');
const contracts = require('./cognitiveBudgetContracts');

let _booted = false;

function bootstrap() {
  if (_booted) return { booted: true };
  _booted = true;
  try {
    console.info(
      '[COGNITIVE_BUDGET_BOOT]',
      JSON.stringify({
        event: 'COGNITIVE_BUDGET_BOOT',
        context_budget: flags.isContextBudgetEnabled(),
        summarizer: flags.isSummarizerEnabled(),
        autoloop: flags.isAutoloopGuardEnabled(),
        autoloop_enforce: flags.isAutoloopGuardEnforce()
      })
    );
  } catch (_e) {}
  return { booted: true };
}

function getHealth() {
  return {
    enabled: flags.isContextBudgetEnabled(),
    flags: {
      context_budget: flags.isContextBudgetEnabled(),
      summarizer: flags.isSummarizerEnabled(),
      autoloop_guard: flags.isAutoloopGuardEnabled(),
      autoloop_enforce: flags.isAutoloopGuardEnforce(),
      saturation_protection: flags.isSaturationProtectionEnabled(),
      token_governance_enforce: flags.isTokenGovernanceEnforce()
    },
    token_governance: tokenGov.getGovernanceSnapshot(),
    autoloop: autoloop.getGuardStats(),
    persona_budgets: quotas.PERSONA_BUDGETS,
    contract_version: contracts.CONTRACT_VERSION
  };
}

module.exports = {
  bootstrap,
  getHealth,
  flags,
  budget,
  tokenGov,
  autoloop,
  safePipeline: require('./safeCognitiveContextPipeline'),
  summarizer: require('./summarizationEngine'),
  factCompression: require('./factCompressionLayer')
};
