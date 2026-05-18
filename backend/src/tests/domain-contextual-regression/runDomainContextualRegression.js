'use strict';

/**
 * Suíte permanente de regressão contextual (Fase C.8).
 * npm run test:domain-contextual-regression
 */

const path = require('path');
const dashboardProfileResolver = require(path.join('..', '..', 'services', 'dashboardProfileResolver'));
const domainAuthority = require(path.join('..', '..', 'domainAuthority'));
const domainRegistry = require(path.join('..', '..', 'domainAuthority/registry/domainRegistry'));
const domainIsolationGuard = require(path.join('..', '..', 'domainAuthority/guards/domainIsolationGuard'));

let passed = 0;
let failed = 0;

function assert(cond, label, detail) {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${label}`);
    return;
  }
  failed += 1;
  console.log(`  FAIL  ${label}`);
  if (detail !== undefined) {
    try {
      console.log('        ', JSON.stringify(detail).slice(0, 500));
    } catch (_) {
      /* ignore */
    }
  }
}

function section(name) {
  console.log(`\n=== ${name} ===`);
}

function cfg(user) {
  return dashboardProfileResolver.getDashboardConfigForUser(user);
}

function snapshot(user, label) {
  const c = cfg(user);
  return {
    label,
    functional_axis: c.functional_axis,
    profile_code: c.profile_code,
    visible_modules: [...(c.profile_config?.visible_modules || [])].sort(),
    contextual_modules_hint: [...(c.contextual_modules_hint || [])].sort(),
    blocked: c.domain_authority?.blocked_modules?.length || 0
  };
}

function testDomainIsolationMatrix() {
  section('Domain isolation — matriz obrigatória');
  const envDenied = domainIsolationGuard.filterModules(
    ['quality_intelligence', 'environment_intelligence', 'dashboard'],
    'environmental'
  );
  assert(!envDenied.modules.includes('quality_intelligence'), 'environmental bloqueia quality_intelligence');
  assert(envDenied.modules.includes('environment_intelligence'), 'environmental mantém environment_intelligence');

  const qDenied = domainIsolationGuard.filterModules(
    ['environment_intelligence', 'quality_intelligence'],
    'quality'
  );
  assert(!qDenied.modules.includes('environment_intelligence'), 'quality bloqueia environment_intelligence');

  const hrDenied = domainIsolationGuard.filterModules(['manuia', 'hr_intelligence', 'dashboard'], 'hr');
  assert(!hrDenied.modules.includes('manuia'), 'HR bloqueia manuia');
  assert(hrDenied.modules.includes('hr_intelligence'), 'HR mantém hr_intelligence');

  const finDenied = domainIsolationGuard.filterModules(['anomaly_detection', 'dashboard'], 'finance');
  assert(!finDenied.modules.includes('anomaly_detection'), 'finance bloqueia anomaly_detection');
}

function testSnapshots() {
  section('Snapshot — perfis reais');
  const scenarios = [
    {
      label: 'Coordenador Meio Ambiente',
      user: {
        id: 's1',
        role: 'coordenador',
        job_title: 'Coordenador de Meio Ambiente',
        department: 'Meio Ambiente'
      },
      expect_axis: 'environmental',
      expect_profile: 'coordinator_environmental',
      deny_module: 'quality_intelligence'
    },
    {
      label: 'Gerente RH',
      user: { id: 's2', role: 'gerente', department: 'Recursos Humanos', job_title: 'Gerente de RH' },
      expect_axis: 'hr',
      expect_profile: 'manager_hr',
      deny_module: 'quality_intelligence'
    },
    {
      label: 'Diretor Financeiro',
      user: { id: 's3', role: 'diretor', job_title: 'CFO', department: 'Controladoria', functional_area: 'finance' },
      expect_axis: 'finance',
      expect_profile: 'director_financial',
      deny_module: 'manuia'
    },
    {
      label: 'Coordenador Jurídico',
      user: { id: 's4', role: 'coordenador', department: 'Jurídico', job_title: 'Coordenador Jurídico' },
      expect_axis: 'legal',
      expect_profile: 'coordinator_legal',
      deny_module: 'quality_intelligence'
    },
    {
      label: 'Técnico Segurança',
      user: {
        id: 's5',
        role: 'coordenador',
        job_title: 'Técnico de Segurança do Trabalho',
        department: 'SST'
      },
      expect_axis: 'safety',
      expect_profile: 'coordinator_safety',
      deny_module: 'quality_intelligence'
    }
  ];

  for (const sc of scenarios) {
    const snap = snapshot(sc.user, sc.label);
    assert(snap.functional_axis === sc.expect_axis, `${sc.label}: axis`, snap);
    assert(snap.profile_code === sc.expect_profile, `${sc.label}: profile`, snap);
    assert(!snap.visible_modules.includes(sc.deny_module), `${sc.label}: sem ${sc.deny_module}`, snap.visible_modules);
  }
}

function testPriority() {
  section('Prioridade semântica');
  const manual = cfg({
    id: 'p1',
    role: 'coordenador',
    functional_area: 'environmental',
    department: 'Qualidade',
    job_title: 'Coordenador de Qualidade'
  });
  assert(manual.functional_axis === 'environmental', 'área manual vence departamento qualidade');
  assert(manual.functional_area_source === 'functional_area_explicit', 'source explicit');
}

function testNegativeInference() {
  section('Negative — sem fallback quality/operations cego');
  const coord = cfg({ id: 'n1', role: 'coordenador', job_title: 'Coordenador', department: 'Administrativo Geral' });
  assert(coord.functional_axis !== 'quality', 'coordenador genérico ≠ quality');

  const mgr = cfg({ id: 'n2', role: 'gerente', job_title: 'Gerente', department: '' });
  assert(mgr.functional_axis !== 'quality', 'gerente genérico ≠ quality');

  const sup = cfg({ id: 'n3', role: 'supervisor', job_title: 'Supervisor', department: 'Geral' });
  assert(sup.functional_axis !== 'quality', 'supervisor genérico ≠ quality');
}

function testDomainAuthorityPack() {
  section('Domain Authority — pacote resolvido');
  const auth = domainAuthority.resolveDomainAuthority(
    { id: 'a1', role: 'coordenador', department: 'Meio Ambiente' },
    { profile_code: 'coordinator_environmental', profile_config: cfg({ id: 'a1', role: 'coordenador', department: 'Meio Ambiente' }).profile_config }
  );
  assert(auth.domain_axis === 'environmental', 'domain_axis');
  assert(Array.isArray(auth.denied_pipelines), 'denied_pipelines');
  assert(auth.ai_contexts.includes('environmental'), 'ai_contexts ambiental');
}

function testRetrocompatQuality() {
  section('Retrocompat — qualidade intacta');
  const q = cfg({ id: 'r1', role: 'coordenador', department: 'Qualidade', job_title: 'Coordenador de Qualidade' });
  assert(q.functional_axis === 'quality', 'quality axis');
  assert(q.profile_code === 'coordinator_quality', 'coordinator_quality');
  assert(q.profile_config.visible_modules.includes('quality_intelligence'), 'quality_intelligence presente');
}

function testRegistryCoverage() {
  section('Registry — domínios obrigatórios');
  const required = [
    'hr',
    'pcp',
    'logistics',
    'procurement',
    'finance',
    'safety',
    'engineering',
    'production',
    'executive',
    'compliance',
    'legal',
    'quality',
    'environmental',
    'sustainability',
    'operations',
    'maintenance',
    'admin'
  ];
  for (const d of required) {
    assert(domainRegistry.getDomain(d).axis === d, `domínio ${d}`);
  }
}

function main() {
  console.log('Domain Contextual Regression Suite (Fase C)');
  testDomainIsolationMatrix();
  testSnapshots();
  testPriority();
  testNegativeInference();
  testDomainAuthorityPack();
  testRetrocompatQuality();
  testRegistryCoverage();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
