/**
 * PLATFORM-2026.1 — Roadmap oficial (derivado ARCH-PLAN-001).
 */
import { getCorporateRoadmap, getEvolutionStrategy } from '../planning/index.js';
import { PLATFORM_RELEASE_ID } from './platformRelease2026Constants.js';

/** Roadmap aprovado top-5 + extensão oficial */
const OFFICIAL_PROGRAM_IDS = Object.freeze({
  finance: 'FIN-EVOLVE-001',
  supply: 'SUP-EVOLVE-001',
  ppap: 'PPAP-EVOLVE-001',
  msa: 'MSA-EVOLVE-001',
  ishikawa: 'ISH-EVOLVE-001',
  purchasing: 'PROC-EVOLVE-001',
  executive: 'EXEC-EVOLVE-001',
  production: 'PRD-EVOLVE-001',
  maintenance: 'MNT-EVOLVE-001',
  hr: 'HR-EVOLVE-001',
  compliance: 'COMP-EVOLVE-001'
});

/** Sequência oficial aprovada — ranks 1-5 conforme ARCH-PLAN + release */
const APPROVED_TOP_SEQUENCE = Object.freeze([
  'finance',
  'supply',
  'ppap',
  'msa',
  'ishikawa'
]);

export function buildOfficialRoadmap() {
  const archRoadmap = getCorporateRoadmap();

  const approvedSequence = APPROVED_TOP_SEQUENCE.map((domainId, index) => {
    const archItem =
      archRoadmap.implementationSequence.find((i) => i.domainId === domainId) || {};
    const strategy = getEvolutionStrategy(domainId);

    return Object.freeze({
      rank: index + 1,
      domainId,
      label: strategy?.label || archItem.label || domainId,
      programId: OFFICIAL_PROGRAM_IDS[domainId],
      strategy: strategy?.strategy,
      strategyRationale: strategy?.rationale,
      horizon: archItem.horizon || null,
      prerequisite: archItem.prerequisite || Object.freeze([]),
      risks: archItem.risks || Object.freeze([]),
      expectedReuse: archItem.expectedReuse || Object.freeze([]),
      deliverable: archItem.deliverable || null,
      approved: true,
      source: 'ARCH-PLAN-001 → PLATFORM-2026.1'
    });
  });

  const extendedSequence = archRoadmap.implementationSequence
    .filter((item) => !APPROVED_TOP_SEQUENCE.includes(item.domainId))
    .map((item) =>
      Object.freeze({
        rank: item.rank,
        domainId: item.domainId,
        label: item.label,
        programId: OFFICIAL_PROGRAM_IDS[item.domainId] || `${item.domainId.toUpperCase()}-EVOLVE-001`,
        strategy: item.strategy,
        horizon: item.horizon,
        approved: false,
        note: 'Sequência estendida — activar após ranks 1-5',
        source: 'ARCH-PLAN-001'
      })
    );

  return Object.freeze({
    releaseId: PLATFORM_RELEASE_ID,
    approved: true,
    approvedTopFive: Object.freeze(approvedSequence),
    extendedSequence: Object.freeze(extendedSequence),
    preservationDomains: archRoadmap.preservationDomains,
    nextProgram: Object.freeze({
      programId: 'FIN-EVOLVE-001',
      domainId: 'finance',
      strategy: 'integrate_then_develop',
      notApproved: 'FIN-001 greenfield directo',
      status: 'ready_to_start_after_release'
    }),
    namingConvention: Object.freeze({
      pattern: '<DOMAIN>-EVOLVE-<NNN>',
      firstWave: Object.freeze(APPROVED_TOP_SEQUENCE.map((d) => OFFICIAL_PROGRAM_IDS[d]))
    })
  });
}

export const PLATFORM_2026_ROADMAP = buildOfficialRoadmap();

export function getOfficialRoadmap() {
  return PLATFORM_2026_ROADMAP;
}

export function getApprovedProgram(rankOrDomainId) {
  if (typeof rankOrDomainId === 'number') {
    return PLATFORM_2026_ROADMAP.approvedTopFive.find((p) => p.rank === rankOrDomainId) ?? null;
  }
  return (
    PLATFORM_2026_ROADMAP.approvedTopFive.find((p) => p.domainId === rankOrDomainId) ??
    PLATFORM_2026_ROADMAP.extendedSequence.find((p) => p.domainId === rankOrDomainId) ??
    null
  );
}

export function validateOfficialRoadmap() {
  const issues = [];
  const top = PLATFORM_2026_ROADMAP.approvedTopFive;
  if (top.length !== 5) issues.push('approved top sequence must have 5 domains');
  if (top[0]?.domainId !== 'finance') issues.push('rank 1 must be finance');
  if (top[0]?.programId !== 'FIN-EVOLVE-001') issues.push('rank 1 program must be FIN-EVOLVE-001');
  if (top[0]?.strategy !== 'integrate_then_develop') {
    issues.push('finance must be integrate_then_develop');
  }
  const expected = ['finance', 'supply', 'ppap', 'msa', 'ishikawa'];
  for (let i = 0; i < expected.length; i++) {
    if (top[i]?.domainId !== expected[i]) {
      issues.push(`rank ${i + 1} expected ${expected[i]}`);
    }
  }
  return {
    valid: issues.length === 0,
    issues,
    releaseId: PLATFORM_RELEASE_ID,
    approvedCount: top.length
  };
}
