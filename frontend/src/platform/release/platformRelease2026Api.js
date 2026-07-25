/**
 * PLATFORM-2026.1 — Release API (read-only · ENT-001 + ARCH-PLAN-001).
 */
import {
  PLATFORM_RELEASE_ID,
  PLATFORM_RELEASE_VERSION,
  PLATFORM_RELEASE_PRINCIPLE,
  PLATFORM_RELEASE_DATE,
  PLATFORM_RELEASE_STATUS,
  PLATFORM_EVOLUTION_PIPELINE,
  PROGRAM_NAMING_CONVENTION
} from './platformRelease2026Constants.js';
import {
  PLATFORM_2026_BASELINE,
  getPlatformBaseline,
  validatePlatformBaseline,
  PLATFORM_STATE_SUMMARY,
  PLATFORM_CERTIFIED_PROGRAMS,
  PLATFORM_FROZEN_CONTRACTS
} from './platformRelease2026Baseline.js';
import {
  PLATFORM_GOVERNANCE,
  getPlatformGovernance,
  isProgramFrozen,
  validatePlatformGovernance,
  PLATFORM_FROZEN_PROGRAMS,
  PLATFORM_EVOLUTION_RULES,
  PLATFORM_EVOLUTION_STRATEGIES,
  STRUCTURAL_CHANGE_CRITERIA
} from './platformRelease2026Governance.js';
import {
  PLATFORM_2026_ROADMAP,
  getOfficialRoadmap,
  getApprovedProgram,
  validateOfficialRoadmap
} from './platformRelease2026Roadmap.js';

export const PLATFORM_RELEASE_API_PHASE = PLATFORM_RELEASE_ID;

export function getReleaseBaseline() {
  return getPlatformBaseline();
}

export function getReleaseGovernance() {
  return getPlatformGovernance();
}

export function getReleaseRoadmap() {
  return getOfficialRoadmap();
}

export function getReleaseExecutiveSummary() {
  const baseline = getPlatformBaseline();
  const roadmap = getOfficialRoadmap();

  return Object.freeze({
    releaseId: PLATFORM_RELEASE_ID,
    version: PLATFORM_RELEASE_VERSION,
    principle: PLATFORM_RELEASE_PRINCIPLE,
    releaseDate: PLATFORM_RELEASE_DATE,
    status: PLATFORM_RELEASE_STATUS,
    headline: 'Plataforma IMPETUS certificada, congelada e pronta para evolução vertical por domínio',
    platformState: PLATFORM_STATE_SUMMARY,
    certifiedProgramFamilies: Object.freeze({
      foundation: PLATFORM_CERTIFIED_PROGRAMS.foundation.length,
      operational: PLATFORM_CERTIFIED_PROGRAMS.operational.length,
      cognitive: PLATFORM_CERTIFIED_PROGRAMS.cognitive.length,
      governance: PLATFORM_CERTIFIED_PROGRAMS.governance.length,
      discoveryAudit: PLATFORM_CERTIFIED_PROGRAMS.discoveryAudit.length
    }),
    frozenProgramCount: PLATFORM_FROZEN_PROGRAMS.length,
    frozenContracts: PLATFORM_FROZEN_CONTRACTS.length,
    evolutionPipeline: PLATFORM_EVOLUTION_PIPELINE,
    nextProgram: roadmap.nextProgram,
    approvedRoadmapTopFive: roadmap.approvedTopFive.map((p) => ({
      rank: p.rank,
      programId: p.programId,
      domainId: p.domainId,
      strategy: p.strategy
    })),
    inventory: baseline.inventory,
    readyForDomainEvolution: baseline.readyForDomainEvolution,
    namingConvention: PROGRAM_NAMING_CONVENTION
  });
}

export function validatePlatformRelease2026Integrity() {
  const baselineCheck = validatePlatformBaseline();
  const governanceCheck = validatePlatformGovernance();
  const roadmapCheck = validateOfficialRoadmap();

  const checks = [baselineCheck, governanceCheck, roadmapCheck];
  const issues = checks.flatMap((c) => c.issues || []);

  return {
    valid: checks.every((c) => c.valid !== false) && issues.length === 0,
    issues,
    releaseId: PLATFORM_RELEASE_ID,
    principle: PLATFORM_RELEASE_PRINCIPLE,
    ent001Valid: baselineCheck.ent001Valid,
    archPlanValid: baselineCheck.archPlanValid,
    readyForDomainEvolution: PLATFORM_2026_BASELINE.readyForDomainEvolution,
    checks: Object.freeze(
      checks.map((c) => ({
        valid: c.valid,
        count: c.programCount || c.frozenCount || c.approvedCount
      }))
    )
  };
}

export {
  PLATFORM_RELEASE_ID,
  PLATFORM_RELEASE_VERSION,
  PLATFORM_RELEASE_PRINCIPLE,
  PLATFORM_2026_BASELINE,
  PLATFORM_GOVERNANCE,
  PLATFORM_2026_ROADMAP,
  PLATFORM_EVOLUTION_RULES,
  PLATFORM_EVOLUTION_STRATEGIES,
  STRUCTURAL_CHANGE_CRITERIA,
  getApprovedProgram,
  isProgramFrozen
};
