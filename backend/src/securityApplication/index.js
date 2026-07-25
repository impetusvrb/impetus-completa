'use strict';

/**
 * APPSEC-01 — Enterprise Application Security Layer
 * Camada oficial aditiva; não altera SEC-01→SEC-21C, Event Governance, Cognitive Core ou ECO.
 */

module.exports = {
  flags: require('./config/appsecFlags'),
  crossTenantAccessValidator: require('./crossTenantAccessValidator'),
  ssrfProtectionEngine: require('./ssrfProtectionEngine'),
  publicEndpointPolicy: require('./publicEndpointPolicy'),
  secretManagement: require('./secretManagement'),
  runtimeConfigurationValidator: require('./runtimeConfigurationValidator'),
  uploadSecurity: require('./uploadSecurity'),
  uploadAclPolicy: require('./uploadAclPolicy'),
  dependencyGovernance: require('./dependencyGovernance'),
  routeSecurityAudit: require('./routeSecurityAudit'),
  owaspCompliance: require('./owaspCompliance'),
  validateAppsecBootOrThrow: require('./runtimeConfigurationValidator').validateAppsecBootOrThrow,
  generateOwaspComplianceReport: require('./owaspCompliance').generateOwaspComplianceReport,
  generateRouteSecurityReport: require('./routeSecurityAudit').generateRouteSecurityReport,
  generateDependencyRiskReport: require('./dependencyGovernance').generateDependencyRiskReport
};
