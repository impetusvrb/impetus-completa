'use strict';

/**
 * WAVE 7 — Industrial Governance Runtime.
 * Orquestra todos os módulos de governança WAVE 7.
 * Bootstrap registado em server.js.
 */

const { GOVERNANCE_V7_ENABLED } = require('./governanceFlags');
const { listWorkflowCapabilities, getCapabilitiesForDomain: getWfCapsForDomain } = require('./workflowCapabilityMatrix');
const { listAbacPolicies } = require('./abacExtension');
const { getAuditStats } = require('./industrialAuditStructure');
const { getImmutableLedgerStats } = require('./immutableWorkflowAuditPrep');
const { getLgpdStats } = require('./lgpdIndustrialPrep');
const { getDomainCapabilityStats } = require('./domainCapabilityGovernance');
const { getTraceabilityStats } = require('./industrialTraceabilityFoundation');

let _bootstrapped = false;
let _bootAt = null;

/**
 * Bootstraps o runtime WAVE 7.
 */
function bootstrap() {
  if (_bootstrapped) return;

  if (!GOVERNANCE_V7_ENABLED) {
    console.info('[GOVERNANCE_V7] Disabled (IMPETUS_GOVERNANCE_V7_ENABLED=false). Modules loaded but inactive.');
    _bootstrapped = true;
    _bootAt = new Date().toISOString();
    return;
  }

  console.info('[GOVERNANCE_V7] Bootstrap starting...');

  const wfCaps = listWorkflowCapabilities();
  const abacPolicies = listAbacPolicies();
  const domainCapStats = getDomainCapabilityStats();

  console.info(
    '[GOVERNANCE_V7] Bootstrap complete — workflow_capabilities=%d abac_policies=%d domain_capabilities=%d',
    wfCaps.length, abacPolicies.length, domainCapStats.total_capabilities
  );

  _bootstrapped = true;
  _bootAt = new Date().toISOString();
}

/**
 * Retorna health completo do runtime WAVE 7.
 */
function getGovernanceHealth() {
  return {
    wave: 7,
    enabled: GOVERNANCE_V7_ENABLED,
    bootstrapped: _bootstrapped,
    boot_at: _bootAt,
    components: {
      workflow_capability_matrix: {
        count: listWorkflowCapabilities().length
      },
      abac_extension: {
        policies: listAbacPolicies().length
      },
      industrial_audit: getAuditStats(),
      immutable_ledger: getImmutableLedgerStats(),
      lgpd_prep: getLgpdStats(),
      domain_capability_governance: getDomainCapabilityStats(),
      traceability: getTraceabilityStats()
    }
  };
}

module.exports = { bootstrap, getGovernanceHealth };
