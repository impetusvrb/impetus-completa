/**
 * AIOI-P6.1 — Executive Access Governance Service (SECURITY ONLY)
 */

import { EXECUTIVE_ACCESS_LEVELS } from './ExecutiveAccessPolicy.js';
import { validateExecutiveAccess } from './ExecutiveAccessValidator.js';

/**
 * @param {{ user?: object|null, authToken?: string|null, portalReadyChecker?: () => boolean }} [context]
 * @returns {{ access_granted: boolean, governance_level?: string, denial_reason?: string }}
 */
export function evaluateExecutiveAccessGovernance(context = {}) {
  const validation = validateExecutiveAccess(context);

  if (validation.ok) {
    return {
      access_granted: true,
      governance_level: EXECUTIVE_ACCESS_LEVELS.EXECUTIVE_ACCESS
    };
  }

  return {
    access_granted: false,
    denial_reason: validation.denialReason,
    governance_level: validation.governanceLevel
  };
}

/**
 * @param {{ user?: object|null, authToken?: string|null, portalReadyChecker?: () => boolean }} [context]
 * @returns {boolean}
 */
export function isExecutiveAccessGranted(context = {}) {
  return evaluateExecutiveAccessGovernance(context).access_granted === true;
}

export default evaluateExecutiveAccessGovernance;
