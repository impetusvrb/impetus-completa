'use strict';

const { logPhaseH } = require('./phaseHLogger');

const ROLLBACK_FLAGS = [
  'IMPETUS_CHAT_GOVERNANCE',
  'IMPETUS_KPI_GOVERNANCE',
  'IMPETUS_SUMMARY_GOVERNANCE',
  'IMPETUS_COGNITIVE_BOUNDARY_GUARD',
  'IMPETUS_COGNITIVE_POLICY_ENGINE',
  'IMPETUS_COGNITIVE_ENVELOPE',
  'IMPETUS_CONTEXT_SANITIZER',
  'IMPETUS_GOVERNANCE_EXPLAINABILITY',
  'IMPETUS_GOVERNANCE_TRACE',
  'IMPETUS_GOVERNANCE_OVERSIGHT',
  'IMPETUS_GOVERNANCE_DRIFT_DETECTION',
  'IMPETUS_GOVERNANCE_AUDIT_FEED',
  'IMPETUS_GOVERNANCE_READINESS',
  'IMPETUS_GOVERNANCE_QUALITY_GATES',
  'IMPETUS_GOVERNANCE_ACTIVATION_PLANNER',
  'IMPETUS_GOVERNANCE_FALSE_POSITIVE_ANALYZER'
];

const PRESERVE_ON_ROLLBACK = [
  'IMPETUS_GOVERNANCE_SHADOW_MODE',
  'IMPETUS_FAILSAFE_GOVERNANCE',
  'IMPETUS_DOMAIN_AUTHORITY',
  'IMPETUS_SAFETY_DOMAIN_ISOLATION',
  'IMPETUS_RUNTIME_TECHNICAL_GUARD'
];

/**
 * Coordena rollback documentado — não altera process.env em runtime (apenas plano).
 */
function coordinateRollback(opts = {}) {
  const scope = opts.scope || 'governance_channels';
  const flagsToDisable =
    scope === 'full_governance' ?
      ROLLBACK_FLAGS :
      scope === 'phase_f_only' ?
        ROLLBACK_FLAGS.filter((f) => f.includes('CHAT') || f.includes('KPI') || f.includes('SUMMARY') || f.includes('BOUNDARY')) :
        (opts.flags || ROLLBACK_FLAGS);

  const commands = flagsToDisable.map((f) => `${f}=off`);
  const preserve = PRESERVE_ON_ROLLBACK.join(', ');

  logPhaseH('GOVERNANCE_ROLLBACK_COORDINATED', { scope, flags: flagsToDisable.length });

  return {
    coordinated: true,
    auto_applied: false,
    scope,
    flags_to_disable: flagsToDisable,
    preserve_flags: PRESERVE_ON_ROLLBACK,
    pm2_hint: `${commands.join(' ')} pm2 reload impetus-backend --update-env`,
    preserve_hint: `Manter: ${preserve}`,
    rebuild_required: false,
    session_reset_required: false
  };
}

module.exports = { coordinateRollback, ROLLBACK_FLAGS, PRESERVE_ON_ROLLBACK };
