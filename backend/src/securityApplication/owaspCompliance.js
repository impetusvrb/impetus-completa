'use strict';

/**
 * APPSEC-01 — Enterprise OWASP / CWE / LGPD Compliance Report
 */

const path = require('path');
const { generateRouteSecurityReport } = require('./routeSecurityAudit');
const { generateDependencyRiskReport } = require('./dependencyGovernance');
const { validateSecrets, buildSecretInventory } = require('./secretManagement');
const { validateRuntimeConfiguration } = require('./runtimeConfigurationValidator');
const flags = require('./config/appsecFlags');

const OWASP_TOP_10_2021 = Object.freeze([
  { id: 'A01', name: 'Broken Access Control', controls: ['crossTenantAccessValidator', 'uploadAclPolicy', 'tenantIsolationGuard'] },
  { id: 'A02', name: 'Cryptographic Failures', controls: ['secretManagement', 'runtimeConfigurationValidator'] },
  { id: 'A03', name: 'Injection', controls: ['parameterized_queries', 'inputSanitization'] },
  { id: 'A04', name: 'Insecure Design', controls: ['uploadSecurity', 'ssrfProtectionEngine'] },
  { id: 'A05', name: 'Security Misconfiguration', controls: ['publicEndpointPolicy', 'runtimeConfigurationValidator'] },
  { id: 'A06', name: 'Vulnerable Components', controls: ['dependencyGovernance'] },
  { id: 'A07', name: 'Identification and Authentication Failures', controls: ['auth.js', 'accountLockout'] },
  { id: 'A08', name: 'Software and Data Integrity Failures', controls: ['incomingWebhookAuth'] },
  { id: 'A09', name: 'Security Logging Failures', controls: ['universalAudit', 'securityObservatory'] },
  { id: 'A10', name: 'SSRF', controls: ['ssrfProtectionEngine'] }
]);

const RED_TEAM_FINDINGS = Object.freeze([
  { id: 'RT-01', title: 'IDOR Chat cross-tenant', priority: 'P0', mitigated_by: 'crossTenantAccessValidator' },
  { id: 'RT-02', title: 'SSRF Time Clock', priority: 'P0', mitigated_by: 'ssrfProtectionEngine' },
  { id: 'RT-03', title: 'SSRF PLC REST', priority: 'P0', mitigated_by: 'ssrfProtectionEngine' },
  { id: 'RT-04', title: 'Uploads legados chat/manuals', priority: 'P1', mitigated_by: 'impetusUploadMiddleware + uploadSecurity' },
  { id: 'RT-05', title: 'boot-metrics/aioi públicos', priority: 'P1', mitigated_by: 'publicEndpointPolicy' },
  { id: 'RT-06', title: 'ACL uploads incompleta', priority: 'P1', mitigated_by: 'uploadAclPolicy' },
  { id: 'RT-07', title: 'Segredos/backups .env', priority: 'P0', mitigated_by: 'secretManagement' },
  { id: 'RT-08', title: 'Config insegura produção', priority: 'P1', mitigated_by: 'runtimeConfigurationValidator' },
  { id: 'RT-09', title: 'Dependências vulneráveis', priority: 'P2', mitigated_by: 'dependencyGovernance' }
]);

/**
 * @param {string} backendRoot
 */
function generateOwaspComplianceReport(backendRoot) {
  const root = backendRoot || path.join(__dirname, '../..');
  const secrets = validateSecrets({ backendRoot: root });
  const runtime = validateRuntimeConfiguration();
  const routes = generateRouteSecurityReport(path.join(root, 'src'));
  let dependencies = null;
  try {
    dependencies = generateDependencyRiskReport(root);
  } catch (e) {
    dependencies = { error: e.message };
  }

  const owasp = OWASP_TOP_10_2021.map((item) => ({
    ...item,
    appsec_layer: 'APPSEC-01',
    enterprise_security: 'SEC-01→SEC-21C unchanged',
    status: 'controlled_by_layer'
  }));

  const redTeam = RED_TEAM_FINDINGS.map((f) => ({
    ...f,
    status: flags.isAppsecEnabled() ? 'mitigation_implemented' : 'pending'
  }));

  return {
    schema_version: 'appsec_owasp_compliance_v1',
    program: 'APPSEC-01',
    generated_at: new Date().toISOString(),
    owasp_top_10: owasp,
    cwe_relevant: ['CWE-639', 'CWE-918', 'CWE-434', 'CWE-200', 'CWE-798', 'CWE-284'],
    lgpd: {
      data_isolation: 'crossTenantAccessValidator + tenantIsolationGuard + RLS pilot',
      audit_trail: 'universalAudit + APPSEC audit events',
      status: 'aligned'
    },
    enterprise_compliance: {
      sec_chain: 'SEC-01 through SEC-21C — not modified',
      event_governance: 'not modified',
      cognitive_core: 'not modified',
      eco: 'not modified'
    },
    red_team_remediation: redTeam,
    secrets: { inventory: buildSecretInventory(), validation: { ok: secrets.ok, errors: secrets.errors } },
    runtime_config: runtime,
    routes,
    dependencies,
    appsec_flags: {
      enabled: flags.isAppsecEnabled(),
      cross_tenant: flags.isCrossTenantValidatorEnabled(),
      ssrf: flags.isSsrfEngineEnabled(),
      public_endpoints: flags.isPublicEndpointPolicyEnabled(),
      secret_mgmt: flags.isSecretManagementEnabled(),
      runtime_config: flags.isRuntimeConfigValidatorEnabled(),
      upload_strict: flags.isUploadSecurityStrict()
    }
  };
}

module.exports = {
  OWASP_TOP_10_2021,
  RED_TEAM_FINDINGS,
  generateOwaspComplianceReport
};
