'use strict';

/**
 * SEC-12 — Change Impact Analyzer.
 * Avalia impacto — nunca altera sistemas.
 */

const PROTECTED_SYSTEMS = Object.freeze([
  'pm2',
  'nginx',
  'event_governance',
  'eco',
  'cognitive_core',
  'enterprise_baseline',
  'frontend',
  'backend',
  'database'
]);

const ACTION_IMPACT_MAP = {
  restrict_admin: { frontend: 'MEDIUM', backend: 'LOW' },
  limit_uploads: { backend: 'MEDIUM', frontend: 'LOW' },
  hide_documentation: { frontend: 'LOW', nginx: 'LOW' },
  maintenance_mode: { frontend: 'HIGH', backend: 'MEDIUM' },
  nginx_hardened_profile: { nginx: 'CRITICAL', frontend: 'HIGH', backend: 'MEDIUM' },
  rate_limit_profile: { backend: 'MEDIUM', express: 'LOW' },
  emergency_login_policy: { backend: 'HIGH', frontend: 'MEDIUM', auth: 'HIGH' },
  hide_admin_endpoints: { backend: 'MEDIUM', frontend: 'MEDIUM' },
  block_known_fingerprint: { nginx: 'HIGH', express: 'HIGH' },
  reduce_api_exposure: { backend: 'MEDIUM', frontend: 'MEDIUM' }
};

function analyzeImpact(action, registryAction) {
  const id = registryAction?.id || action?.id || action?.action;
  const impactMap = ACTION_IMPACT_MAP[id] || {};
  const impacts = {};

  for (const sys of PROTECTED_SYSTEMS) {
    impacts[sys] = impactMap[sys] || 'NONE';
  }

  if (id === 'nginx_hardened_profile' || id === 'block_known_fingerprint') {
    impacts.pm2 = 'NONE';
    impacts.event_governance = 'NONE';
    impacts.eco = 'NONE';
    impacts.cognitive_core = 'NONE';
    impacts.enterprise_baseline = 'NONE';
    impacts.database = 'NONE';
  }

  const levels = Object.values(impacts).filter((v) => v !== 'NONE');
  const maxImpact = levels.includes('CRITICAL')
    ? 'CRITICAL'
    : levels.includes('HIGH')
      ? 'HIGH'
      : levels.includes('MEDIUM')
        ? 'MEDIUM'
        : levels.includes('LOW')
          ? 'LOW'
          : 'NONE';

  const canDropImpetus = maxImpact === 'CRITICAL' || id === 'maintenance_mode';

  return {
    actionId: id,
    impacts,
    maxImpact,
    canDropImpetus,
    protectedSystemsIntact: {
      event_governance: impacts.event_governance === 'NONE',
      eco: impacts.eco === 'NONE',
      cognitive_core: impacts.cognitive_core === 'NONE',
      enterprise_baseline: impacts.enterprise_baseline === 'NONE'
    }
  };
}

function analyzePlanImpact(actions) {
  return (actions || []).map((entry) => analyzeImpact(entry, entry.registryAction));
}

module.exports = { PROTECTED_SYSTEMS, analyzeImpact, analyzePlanImpact };
