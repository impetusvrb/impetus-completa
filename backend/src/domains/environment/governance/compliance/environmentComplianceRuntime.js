'use strict';

const obs = require('../shared/environmentGovernanceObservability');
const flags = require('../environmentGovernanceRuntimeFlags');

function environmentLicensingRuntime(input = {}) {
  const licenses = input.licenses || [];
  const expiring = licenses.filter((l) => l.days_to_expire != null && l.days_to_expire <= 90);
  return { total: licenses.length, expiring_count: expiring.length, expiring };
}

function environmentLegalRequirementRuntime(input = {}) {
  return {
    obligations_total: (input.obligations || []).length,
    overdue: (input.obligations || []).filter((o) => o.status === 'overdue').length
  };
}

function environmentAuditRuntime(input = {}) {
  return {
    audits_open: (input.audits || []).filter((a) => a.status !== 'closed').length,
    findings_open: (input.findings || []).filter((f) => !f.closed).length
  };
}

function environmentComplianceAlertRuntime(lic, legal) {
  const alerts = [];
  if (lic.expiring_count > 0) alerts.push({ code: 'license_expiring', severity: 'high' });
  if (legal.overdue > 0) alerts.push({ code: 'legal_overdue', severity: 'critical' });
  return { alerts, alert_count: alerts.length };
}

function environmentComplianceNarrativeRuntime(lic, alerts) {
  return {
    assistive_only: true,
    headline: `${alerts.alert_count} alerta(s) compliance assistivo(s)`,
    detail: `${lic.expiring_count} licença(s) a vencer em 90 dias`
  };
}

function environmentComplianceRuntime(input = {}) {
  if (!flags.isEnvironmentGovernanceRuntimeEnabled()) return { skipped: true };
  return obs.withTiming(
    'environment_governance_runtime_ms',
    () => {
      const licensing = environmentLicensingRuntime(input);
      const legal = environmentLegalRequirementRuntime(input);
      const audit = environmentAuditRuntime(input);
      const alerts = environmentComplianceAlertRuntime(licensing, legal);
      return {
        ok: true,
        licensing,
        legal,
        audit,
        alerts,
        narrative: environmentComplianceNarrativeRuntime(licensing, alerts),
        assistive_only: true,
        no_auto_enforcement: true
      };
    },
    { module: 'compliance' }
  );
}

module.exports = {
  environmentComplianceRuntime,
  environmentLicensingRuntime,
  environmentAuditRuntime,
  environmentLegalRequirementRuntime,
  environmentComplianceAlertRuntime,
  environmentComplianceNarrativeRuntime
};
