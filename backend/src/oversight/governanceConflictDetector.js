'use strict';

const { logPhaseG } = require('../explainability/phaseGLogger');

/**
 * Detecta conflitos entre camadas de governança.
 */
function detectConflicts(ctx = {}) {
  const conflicts = [];
  const { legacy, governed, exposure, channel } = ctx;

  if (legacy && governed) {
    const legacyMods = new Set(legacy.visible_modules || []);
    const govMods = new Set(governed.visible_modules || []);
    for (const m of legacyMods) {
      if (!govMods.has(m)) {
        conflicts.push({
          type: 'module_only_in_legacy',
          scope: m,
          severity: 'medium',
          channel
        });
      }
    }
    for (const m of govMods) {
      if (!legacyMods.has(m)) {
        conflicts.push({
          type: 'module_only_in_governed',
          scope: m,
          severity: 'low',
          channel
        });
      }
    }
  }

  if (exposure?.policy_precedence?.denies?.length && exposure?.policy_precedence?.allows?.length) {
    const denyScopes = new Set(exposure.policy_precedence.denies.map((d) => d.scope));
    const overlap = exposure.policy_precedence.allows.filter((a) => denyScopes.has(a.scope));
    if (overlap.length) {
      conflicts.push({
        type: 'deny_allow_overlap',
        scopes: overlap.map((o) => o.scope),
        severity: 'high',
        channel
      });
    }
  }

  if (conflicts.length) {
    logPhaseG('GOVERNANCE_CONFLICT_DETECTED', { channel, count: conflicts.length });
  }

  return { has_conflicts: conflicts.length > 0, conflicts };
}

module.exports = { detectConflicts };
