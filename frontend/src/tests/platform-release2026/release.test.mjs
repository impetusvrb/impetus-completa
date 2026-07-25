/**
 * PLATFORM-2026.1 — Release integrity + governance tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLATFORM_RELEASE_ID,
  PLATFORM_RELEASE_PRINCIPLE,
  getReleaseBaseline,
  getReleaseGovernance,
  getReleaseRoadmap,
  getReleaseExecutiveSummary,
  validatePlatformRelease2026Integrity,
  getApprovedProgram,
  isProgramFrozen,
  PLATFORM_FROZEN_PROGRAMS,
  PLATFORM_EVOLUTION_RULES
} from '../../platform/release/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const RELEASE_DOCS = path.join(FE, 'docs/platform-release');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

console.log('PLATFORM-2026.1 — release.test\n');

test('FREEZE BEFORE EVOLVE principle', () => {
  assert.equal(PLATFORM_RELEASE_PRINCIPLE, 'FREEZE BEFORE EVOLVE');
  assert.equal(PLATFORM_RELEASE_ID, 'PLATFORM-2026.1');
});

test('release integrity (ENT-001 + ARCH-PLAN required)', () => {
  const result = validatePlatformRelease2026Integrity();
  assert.equal(result.valid, true, result.issues.join('; '));
  assert.equal(result.ent001Valid, true);
  assert.equal(result.archPlanValid, true);
  assert.equal(result.readyForDomainEvolution, true);
});

test('baseline declares platform ready', () => {
  const baseline = getReleaseBaseline();
  assert.equal(baseline.readyForDomainEvolution, true);
  assert.ok(baseline.platformState.length >= 9);
  assert.ok(baseline.inventory.domainCount >= 15);
});

test('14 frozen program families', () => {
  assert.equal(PLATFORM_FROZEN_PROGRAMS.length, 14);
  assert.ok(isProgramFrozen('OPM'));
  assert.ok(isProgramFrozen('CPL'));
  assert.ok(isProgramFrozen('ENT'));
  assert.ok(isProgramFrozen('ARCH-PLAN'));
});

test('evolution rules formalized', () => {
  assert.ok(PLATFORM_EVOLUTION_RULES.length >= 8);
  assert.ok(PLATFORM_EVOLUTION_RULES.some((r) => r.ruleId === 'use_eox'));
  assert.ok(PLATFORM_EVOLUTION_RULES.some((r) => r.ruleId === 'cpl_adapters_only'));
});

test('official roadmap top 5 approved', () => {
  const roadmap = getReleaseRoadmap();
  assert.equal(roadmap.approvedTopFive.length, 5);
  assert.equal(roadmap.approvedTopFive[0].programId, 'FIN-EVOLVE-001');
  assert.equal(roadmap.approvedTopFive[0].strategy, 'integrate_then_develop');
  assert.equal(roadmap.approvedTopFive[1].programId, 'SUP-EVOLVE-001');
  assert.equal(roadmap.approvedTopFive[2].programId, 'PPAP-EVOLVE-001');
  assert.equal(roadmap.approvedTopFive[4].programId, 'ISH-EVOLVE-001');
});

test('getApprovedProgram by rank and domain', () => {
  assert.equal(getApprovedProgram(1).domainId, 'finance');
  assert.equal(getApprovedProgram('ppap').programId, 'PPAP-EVOLVE-001');
});

test('governance forbids horizontal programs', () => {
  const gov = getReleaseGovernance();
  assert.equal(gov.horizontalProgramsForbidden, true);
  assert.ok(gov.extraordinaryDecisionRequired.includes('CPL-004'));
  assert.ok(gov.structuralChangeCriteria.length >= 5);
});

test('executive summary — platform state', () => {
  const summary = getReleaseExecutiveSummary();
  assert.ok(summary.platformState.some((s) => s.area === 'WMS' && s.state === 'Certificado'));
  assert.ok(summary.platformState.some((s) => s.area === 'Planejamento' && s.state === 'Aprovado'));
  assert.equal(summary.nextProgram.programId, 'FIN-EVOLVE-001');
  assert.equal(summary.nextProgram.notApproved, 'FIN-001 greenfield directo');
});

test('naming convention DOMAIN-EVOLVE-NNN', () => {
  const summary = getReleaseExecutiveSummary();
  assert.equal(summary.namingConvention.pattern, '<DOMAIN>-EVOLVE-<NNN>');
  assert.ok(summary.namingConvention.examples.includes('FIN-EVOLVE-001'));
});

test('platform-release documentation deliverables exist', () => {
  const docs = [
    'PLATFORM-2026.1-BASELINE.md',
    'PLATFORM-2026.1-CERTIFICATION.md',
    'PLATFORM-2026.1-FROZEN-PROGRAMS.md',
    'PLATFORM-2026.1-EVOLUTION-RULES.md',
    'PLATFORM-2026.1-ROADMAP.md',
    'PLATFORM-2026.1-GOVERNANCE.md',
    'PLATFORM-2026.1-EXECUTIVE-SUMMARY.md'
  ];
  for (const doc of docs) {
    assert.ok(fs.existsSync(path.join(RELEASE_DOCS, doc)), `missing ${doc}`);
  }
});

console.log(`\nPLATFORM-2026.1 release: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
