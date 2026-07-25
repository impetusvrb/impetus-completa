'use strict';

/**
 * APPSEC-02A — Enterprise Operational Hardening & External Red Team Readiness
 * Read-only; não altera SEC / APPSEC-01 / APPSEC-02.
 */

module.exports = {
  flags: require('./config/readinessFlags'),
  secretCleanupEngine: require('./secretCleanupEngine'),
  runtimeConfigurationReadiness: require('./runtimeConfigurationReadiness'),
  dependencyUpgradePlanner: require('./dependencyUpgradePlanner'),
  runtimeRestartValidator: require('./runtimeRestartValidator'),
  confidenceLevelEngine: require('./confidenceLevelEngine'),
  externalRedTeamReadiness: require('./externalRedTeamReadiness'),
  operationalReadinessOrchestrator: require('./operationalReadinessOrchestrator'),
  buildReadiness: (opts) => require('./operationalReadinessOrchestrator').buildOperationalReadinessBundle(opts),
  getLatestReadiness: () => require('./operationalReadinessOrchestrator').getLatestBundleSync()
};
