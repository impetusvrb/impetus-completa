'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

module.exports = {
  isTerminalGovernanceEnabled: () => _flag('IMPETUS_TERMINAL_GOVERNANCE', false),
  isTerminalSidebarLockEnabled: () => _flag('IMPETUS_TERMINAL_SIDEBAR_LOCK', false),
  isTerminalKpiLockEnabled: () => _flag('IMPETUS_TERMINAL_KPI_LOCK', false),
  isTerminalSummaryLockEnabled: () => _flag('IMPETUS_TERMINAL_SUMMARY_LOCK', false),
  isTerminalReinjectionBlockEnabled: () => _flag('IMPETUS_TERMINAL_REINJECTION_BLOCK', false),
  isTerminalGovernanceObservabilityEnabled: () => _flag('IMPETUS_TERMINAL_GOVERNANCE_OBSERVABILITY', true),
  autoRemediation: false,
  globalAutoPruning: false
};
