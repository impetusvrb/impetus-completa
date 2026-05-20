'use strict';

/**
 * Fase E — testes permanentes de governança cognitiva
 * npm run test:cognitive-governance
 */

const path = require('path');
const fs = require('fs');
const policyEngine = require(path.join('..', '..', 'src', 'policyEngine'));
const { resolvePrecedence } = require(path.join('..', '..', 'src', 'policyEngine/policyPrecedenceResolver'));
const { SAFE_MINIMAL_EXPOSURE } = require(path.join('..', '..', 'src', 'policyEngine/policies/safeMinimalPolicy'));
const contextSanitizer = require(path.join('..', '..', 'src', 'security/contextExposureSanitizer'));
const dpr = require(path.join('..', '..', 'src', 'services/dashboardProfileResolver'));

const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');

const PERSONAS = [
  {
    name: 'quality_coordinator',
    user: {
      id: 'q1',
      role: 'coordenador',
      department: 'Qualidade',
      job_title: 'Coordenador de Qualidade',
      functional_area: 'quality',
      hierarchy_level: 3,
      company_id: 'test-co'
    },
    expect_axis: 'quality',
    expect_profile: 'coordinator_quality'
  },
  {
    name: 'environmental_coordinator',
    user: {
      id: 'e1',
      role: 'coordenador',
      department: 'Meio Ambiente',
      functional_area: 'environmental',
      hierarchy_level: 3,
      company_id: 'test-co'
    },
    expect_axis: 'environmental',
    expect_profile: 'coordinator_environmental'
  },
  {
    name: 'safety_coordinator',
    user: {
      id: 's1',
      role: 'coordenador',
      department: 'Segurança do Trabalho',
      job_title: 'Coordenador de Segurança do Trabalho',
      functional_area: 'safety',
      hierarchy_level: 3,
      company_id: 'test-co'
    },
    expect_axis: 'safety',
    expect_profile: 'coordinator_safety'
  },
  {
    name: 'hr_manager',
    user: {
      id: 'h1',
      role: 'gerente',
      department: 'Recursos Humanos',
      functional_area: 'hr',
      hierarchy_level: 2,
      company_id: 'test-co'
    },
    expect_axis: 'hr',
    expect_profile: 'manager_hr'
  },
  {
    name: 'financial_manager',
    user: {
      id: 'f1',
      role: 'gerente',
      department: 'Financeiro',
      functional_area: 'finance',
      hierarchy_level: 2,
      company_id: 'test-co'
    },
    expect_axis: 'finance',
    expect_profile: 'manager_financial'
  },
  {
    name: 'executive_director',
    user: {
      id: 'd1',
      role: 'diretor',
      department: 'Diretoria',
      hierarchy_level: 1,
      company_id: 'test-co'
    },
    expect_axis: 'executive',
    expect_profile: 'director_unassigned'
  }
];

let passed = 0;
let failed = 0;

function assert(cond, msg, detail) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${msg}`);
  } else {
    failed++;
    console.log(`  FAIL  ${msg}`);
    if (detail) console.log('       ', JSON.stringify(detail).slice(0, 350));
  }
}

function testDenyPrecedence() {
  console.log('\n=== Deny precedence ===');
  const r = resolvePrecedence([
    { layer: 'ux', effect: 'allow', scope: 'widget:kpi' },
    { layer: 'rbac', effect: 'allow', scope: 'dashboard' },
    { layer: 'domain_authority', effect: 'deny', scope: 'environment_intelligence' }
  ]);
  assert(r.allowed === false, 'deny vence allow');
  assert(r.winning_layer === 'domain_authority', 'layer domain_authority', r);
}

function testSafeMinimalNotPermissive() {
  console.log('\n=== Safe minimal (não permissivo) ===');
  assert(SAFE_MINIMAL_EXPOSURE.allow_ai_insights === false, 'ai off');
  assert(SAFE_MINIMAL_EXPOSURE.sections.kpi_request === false, 'kpi section off');
  assert(
    !SAFE_MINIMAL_EXPOSURE.visible_modules.includes('environment_intelligence'),
    'sem env module no failsafe'
  );
}

function testContextSanitizer() {
  console.log('\n=== Context sanitizer ===');
  const prev = process.env.IMPETUS_CONTEXT_SANITIZER;
  process.env.IMPETUS_CONTEXT_SANITIZER = 'on';
  delete require.cache[require.resolve('../../src/policyEngine/config/cognitiveFeatureFlags')];
  delete require.cache[require.resolve('../../src/security/contextExposureSanitizer')];
  const san = require('../../src/security/contextExposureSanitizer');
  const out = san.sanitizeContextForAI(
    { mqtt: { x: 1 }, metrics: { primary_table: 't' }, cross_domain: { hr: 1 } },
    { id: 'u1', hierarchy_level: 4 },
    { strategic_access: false, cross_domain_access: false, ai_inference_scope: 'restricted' }
  );
  assert(out.mqtt === undefined, 'mqtt removido');
  assert(out.cross_domain === undefined, 'cross_domain removido');
  process.env.IMPETUS_CONTEXT_SANITIZER = prev;
}

async function testUnifiedExposureLegacyMode() {
  console.log('\n=== Unified exposure (policy engine off) ===');
  const prev = process.env.IMPETUS_COGNITIVE_POLICY_ENGINE;
  process.env.IMPETUS_COGNITIVE_POLICY_ENGINE = 'off';
  delete require.cache[require.resolve('../../src/policyEngine/config/cognitiveFeatureFlags')];
  delete require.cache[require.resolve('../../src/policyEngine/unifiedExposureResolver')];
  const { resolveContentExposure } = require('../../src/policyEngine/unifiedExposureResolver');
  const u = PERSONAS[2].user;
  const exp = await resolveContentExposure(u, {});
  assert(exp.policy_engine_enabled === false, 'engine off preserva legacy');
  assert(Array.isArray(exp.visible_modules), 'visible_modules presente');
  process.env.IMPETUS_COGNITIVE_POLICY_ENGINE = prev;
}

async function testPersonaSnapshots() {
  console.log('\n=== Snapshots por persona ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const prevPe = process.env.IMPETUS_COGNITIVE_POLICY_ENGINE;
  const prevEnv = process.env.IMPETUS_COGNITIVE_ENVELOPE;
  process.env.IMPETUS_COGNITIVE_POLICY_ENGINE = 'on';
  process.env.IMPETUS_COGNITIVE_ENVELOPE = 'on';
  delete require.cache[require.resolve('../../src/policyEngine/config/cognitiveFeatureFlags')];
  delete require.cache[require.resolve('../../src/policyEngine/unifiedExposureResolver')];
  const { resolveContentExposure } = require('../../src/policyEngine/unifiedExposureResolver');

  for (const p of PERSONAS) {
    const cfg = dpr.getDashboardConfigForUser(p.user);
    if (p.expect_axis) assert(cfg.functional_axis === p.expect_axis, `${p.name} axis`, cfg);
    if (p.expect_profile) assert(cfg.profile_code === p.expect_profile, `${p.name} profile`, cfg);

    const exp = await resolveContentExposure(p.user, { sections: {} });
    const snap = {
      functional_axis: exp.functional_axis || cfg.functional_axis,
      profile_code: exp.profile_code || cfg.profile_code,
      visible_modules: exp.visible_modules,
      denied_modules: exp.denied_modules || [],
      allow_ai_insights: exp.allow_ai_insights,
      allow_kpis: exp.allow_kpis,
      cognitive_envelope: exp.cognitive_envelope ?
        {
          depth: exp.cognitive_envelope.depth,
          primary_axis: exp.cognitive_envelope.primary_axis,
          ai_inference_scope: exp.cognitive_envelope.ai_inference_scope,
          cross_domain_access: exp.cognitive_envelope.cross_domain_access
        } :
        null,
      policy_engine_enabled: exp.policy_engine_enabled
    };
    if (p.name === 'safety_coordinator') {
      assert(!snap.visible_modules.includes('environment_intelligence'), 'SST sem environment_intelligence', snap);
    }
    if (p.name === 'environmental_coordinator') {
      assert(snap.visible_modules.includes('environment_intelligence'), 'ambiental com environment_intelligence', snap);
    }
    const outPath = path.join(SNAPSHOT_DIR, `${p.name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(snap, null, 2));
    console.log(`  SNAP  ${outPath}`);
  }

  process.env.IMPETUS_COGNITIVE_POLICY_ENGINE = prevPe;
  process.env.IMPETUS_COGNITIVE_ENVELOPE = prevEnv;
}

function testCrossDomainLeakagePrevention() {
  console.log('\n=== Cross-domain leakage (domain deny) ===');
  const r = resolvePrecedence([
    { layer: 'ia_contextual', effect: 'allow', scope: 'suggest:esg' },
    { layer: 'deny', effect: 'deny', scope: 'quality_intelligence', reason: 'safety_axis' }
  ]);
  assert(r.allowed === false, 'deny explícito vence IA');
}

async function main() {
  console.log('Cognitive Governance Foundation (Fase E)');
  testDenyPrecedence();
  testSafeMinimalNotPermissive();
  testContextSanitizer();
  await testUnifiedExposureLegacyMode();
  testCrossDomainLeakagePrevention();
  await testPersonaSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
