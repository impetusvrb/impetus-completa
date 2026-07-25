'use strict';

/**
 * APPSEC-02 — Enterprise Red Team Validation & Security Regression
 * Read-only; valida eficácia do APPSEC-01.
 */

module.exports = {
  dto: require('./dto/appsecValidationDto'),
  baseline: require('./baseline/redTeamBaseline20260704'),
  redTeamScenarioRunner: require('./redTeamScenarioRunner'),
  vulnerabilityRegressionEngine: require('./vulnerabilityRegressionEngine'),
  securityComparisonEngine: require('./securityComparisonEngine'),
  appsecCertificationEngine: require('./appsecCertificationEngine'),
  securityEvidenceBuilder: require('./securityEvidenceBuilder'),
  runValidation: () => require('./securityEvidenceBuilder').buildValidationEvidence(),
  getAuditPayload: () => {
    const latest = require('./securityEvidenceBuilder').getLatestEvidenceSync();
    if (latest) return latest;
    return require('./securityEvidenceBuilder').buildValidationEvidence({ persist: true });
  }
};
