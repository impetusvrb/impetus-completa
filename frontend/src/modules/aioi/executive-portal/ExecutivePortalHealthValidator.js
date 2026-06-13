/**
 * AIOI-P5.9 — Portal Health Model (READ ONLY · classificação de prontidão)
 */

/**
 * @param {number} modulesReady
 * @param {number} modulesTotal
 * @returns {string}
 */
export function classifyReadinessLevel(modulesReady, modulesTotal) {
  if (!modulesTotal || modulesTotal <= 0) {
    return 'incomplete';
  }
  const ratio = (modulesReady / modulesTotal) * 100;
  if (ratio >= 100) return 'portal_ready';
  if (ratio >= 75) return 'mostly_ready';
  if (ratio >= 50) return 'partial';
  return 'incomplete';
}

/**
 * @param {{ modulesReady: number, modulesTotal: number, checksOk?: boolean }} input
 * @returns {{ portal_ready: boolean, modules_ready: number, modules_total: number, readiness_level: string }}
 */
export function buildPortalHealthModel(input) {
  const modulesReady = input.modulesReady ?? 0;
  const modulesTotal = input.modulesTotal ?? 0;
  const readinessLevel = classifyReadinessLevel(modulesReady, modulesTotal);
  const allChecksOk = input.checksOk !== false;

  return {
    portal_ready: readinessLevel === 'portal_ready' && allChecksOk,
    modules_ready: modulesReady,
    modules_total: modulesTotal,
    readiness_level: readinessLevel
  };
}

export default buildPortalHealthModel;
