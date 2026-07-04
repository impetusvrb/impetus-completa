'use strict';

/**
 * SEC-11 — Recovery Planner.
 * Gera planos — nunca executa.
 */

function buildRecoveryPlan(context) {
  const {
    incidents = [],
    recommendedProfile = 'NORMAL',
    integrityReport = null,
    threatLevel = 'LOW'
  } = context;

  const steps = [];
  steps.push({
    phase: 'CONTAIN',
    order: 1,
    action: 'Review open incidents and SEC-10 recommendations',
    auto_execute: false
  });
  steps.push({
    phase: 'CONTAIN',
    order: 2,
    action: 'Verify runtime integrity baseline (SEC-04)',
    auto_execute: false
  });

  if (['DEFENSE', 'PROTECTED', 'LOCKDOWN'].includes(recommendedProfile)) {
    steps.push({
      phase: 'HARDEN',
      order: 3,
      action: 'Apply approved surface plan (human operator)',
      auto_execute: false
    });
  }

  if (integrityReport?.integrityStatus === 'COMPROMISED') {
    steps.push({
      phase: 'RECOVER',
      order: 4,
      action: 'Compare file hashes against SECURITY-BASELINE-01',
      auto_execute: false
    });
    steps.push({
      phase: 'RECOVER',
      order: 5,
      action: 'Restore compromised files from baseline evidence',
      auto_execute: false
    });
  }

  steps.push({
    phase: 'POST_INCIDENT',
    order: 6,
    action: 'Document timeline and update SEC-09 promotion evidence',
    auto_execute: false
  });
  steps.push({
    phase: 'POST_INCIDENT',
    order: 7,
    action: 'Gradual profile downgrade NORMAL ← ELEVATED with observation windows',
    auto_execute: false
  });

  return {
    schema_version: 'recovery_plan_v1',
    planId: `rec-${Date.now()}`,
    threatLevel,
    incidentCount: incidents.length,
    steps,
    read_only: true,
    auto_execute: false
  };
}

function buildRollbackPlan(recommendedProfile) {
  return {
    schema_version: 'rollback_plan_v1',
    planId: `rb-${Date.now()}`,
    actions: [
      { step: 1, action: 'SECURITY_ADAPTIVE_PROTECTION=false', note: 'Desactivar SEC-11' },
      { step: 2, action: 'Revert to NORMAL protection profile (logical)', note: 'Store only' },
      { step: 3, action: 'pm2 restart impetus-backend --update-env', note: 'Operator manual' },
      { step: 4, action: 'Verify SEC-01→10 audit endpoints', note: 'Health check' }
    ],
    fromProfile: recommendedProfile,
    toProfile: 'NORMAL',
    maxMinutes: 5,
    auto_execute: false
  };
}

function buildPostIncidentPlan(incidents) {
  return {
    schema_version: 'post_incident_plan_v1',
    planId: `post-${Date.now()}`,
    lessons: [
      'Preserve nginx access logs for forensic analysis',
      'Review SECURITY-BASELINE-01 hash mismatches',
      'Activate SEC-09 passive modules if still shadow',
      'Schedule SEC-12 evaluation for controlled auto-protection'
    ],
    affectedIncidents: incidents.slice(0, 10).map((i) => i.incidentId),
    auto_execute: false
  };
}

module.exports = {
  buildRecoveryPlan,
  buildRollbackPlan,
  buildPostIncidentPlan
};
