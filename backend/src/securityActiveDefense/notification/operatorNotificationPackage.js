'use strict';

/**
 * SEC-10 — Operator Notification Package (preparação only).
 * Nunca envia e-mail — adapters preparados para futuro.
 */

const flags = require('../config/securityActiveDefenseFlags');

function buildOriginBlock(incident, profile) {
  const ips = incident?.participants?.ips || [];
  return {
    ips: ips.slice(0, 20),
    asn: profile?.asnHints || incident?.participants?.asns || [],
    country: profile?.originAssessment?.label || 'Unknown',
    provider: (profile?.providerHints || [])[0] || 'Unknown'
  };
}

function buildOperatorPackage(operator, context) {
  const {
    incident,
    profile,
    threatLevel,
    patterns,
    recommendations,
    integrity,
    timeline,
    campaign
  } = context;

  return {
    schema_version: 'operator_notification_package_v1',
    operator,
    preparedAt: new Date().toISOString(),
    deliveryStatus: 'PREPARED_NOT_SENT',
    incident: incident
      ? {
          incidentId: incident.incidentId,
          severity: incident.severity,
          classification: incident.classification,
          status: incident.status,
          firstSeen: incident.firstSeen,
          lastSeen: incident.lastSeen
        }
      : null,
    timeline: timeline || incident?.timeline || [],
    threatScore: profile?.confidence ?? incident?.riskScore ?? 0,
    riskScore: incident?.riskScore ?? 0,
    integrity: integrity || { status: 'UNKNOWN', score: null },
    assets: profile?.affectedAssets || incident?.affectedComponents || [],
    origin: buildOriginBlock(incident, profile),
    campaign: campaign || null,
    attackPatterns: patterns || [],
    recommendations: recommendations || [],
    rollback: {
      disable_active_defense: 'SECURITY_ACTIVE_DEFENSE=false',
      note: 'Rollback independente SEC-10 — não afecta SEC-01→09'
    },
    read_only: true
  };
}

function preparePackagesForOperators(context) {
  const operators = flags.operatorRecipients();
  return operators.map((op) => buildOperatorPackage(op, context));
}

module.exports = {
  buildOperatorPackage,
  preparePackagesForOperators,
  buildOriginBlock
};
