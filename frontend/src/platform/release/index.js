/**
 * PLATFORM-2026.1 — Enterprise Baseline Release.
 *
 * Formalização read-only da Baseline Oficial.
 * Consome exclusivamente ENT-001 + ARCH-PLAN-001.
 * Não implementa funcionalidades. Não altera domínios certificados.
 */
export {
  PLATFORM_RELEASE_ID,
  PLATFORM_RELEASE_VERSION,
  PLATFORM_RELEASE_PRINCIPLE,
  PLATFORM_RELEASE_DATE,
  PLATFORM_RELEASE_STATUS,
  PLATFORM_EVOLUTION_PIPELINE,
  PROGRAM_NAMING_CONVENTION,
  PROGRAM_FREEZE_STATE
} from './platformRelease2026Constants.js';

export {
  PLATFORM_2026_BASELINE,
  PLATFORM_CERTIFIED_PROGRAMS,
  PLATFORM_CERTIFIED_COMPONENTS,
  PLATFORM_FROZEN_CONTRACTS,
  PLATFORM_STATE_SUMMARY,
  buildPlatformBaseline,
  getPlatformBaseline,
  validatePlatformBaseline
} from './platformRelease2026Baseline.js';

export {
  PLATFORM_GOVERNANCE,
  PLATFORM_FROZEN_PROGRAMS,
  FROZEN_PROGRAM_ALLOWED_CHANGES,
  PLATFORM_EVOLUTION_RULES,
  PLATFORM_EVOLUTION_STRATEGIES,
  STRUCTURAL_CHANGE_CRITERIA,
  getPlatformGovernance,
  isProgramFrozen,
  validatePlatformGovernance
} from './platformRelease2026Governance.js';

export {
  PLATFORM_2026_ROADMAP,
  buildOfficialRoadmap,
  getOfficialRoadmap,
  getApprovedProgram,
  validateOfficialRoadmap
} from './platformRelease2026Roadmap.js';

export {
  PLATFORM_RELEASE_API_PHASE,
  getReleaseBaseline,
  getReleaseGovernance,
  getReleaseRoadmap,
  getReleaseExecutiveSummary,
  validatePlatformRelease2026Integrity
} from './platformRelease2026Api.js';
