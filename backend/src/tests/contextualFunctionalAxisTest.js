'use strict';

/**
 * Inferência de eixo funcional / dashboard ambiental vs qualidade.
 *
 *   npm run test:contextual-functional-axis
 *   node src/tests/contextualFunctionalAxisTest.js
 */

const path = require('path');
const functionalAxisResolver = require(path.join('..', 'services', 'functionalAxisResolver'));
const dashboardProfileResolver = require(path.join('..', 'services', 'dashboardProfileResolver'));
const catalog = require(path.join('..', 'config', 'functionalAreaCatalog'));

let _passed = 0;
let _failed = 0;

function assert(cond, label, detail) {
  if (cond) {
    _passed += 1;
    console.log(`  PASS  ${label}`);
    return true;
  }
  _failed += 1;
  console.log(`  FAIL  ${label}`);
  if (detail !== undefined) {
    try {
      console.log('        ', JSON.stringify(detail).slice(0, 600));
    } catch (_) {
      /* ignore */
    }
  }
  return false;
}

function section(name) {
  console.log(`\n=== ${name} ===`);
}

function axis(user) {
  return functionalAxisResolver.resolveFunctionalAxis(user);
}

function cfg(user) {
  return dashboardProfileResolver.getDashboardConfigForUser(user);
}

function testCoordinatorEnvironmental() {
  section('Coordenador de Meio Ambiente → environmental');
  const u = {
    id: 'env-coord-1',
    company_id: 'c1',
    role: 'coordenador',
    job_title: 'Coordenador de Meio Ambiente',
    department: 'Meio Ambiente',
    area: 'meio ambiente'
  };
  const a = axis(u);
  assert(a.functional_axis === 'environmental', 'functional_axis environmental', a);
  assert(a.source !== 'job_title_legacy' || a.priority <= 7, 'não via legacy genérico', a);

  const c = cfg(u);
  assert(c.functional_axis === 'environmental', 'config functional_axis', c);
  assert(c.profile_code === 'coordinator_environmental', 'perfil coordinator_environmental', c);
  const mods = c.profile_config?.visible_modules || [];
  assert(mods.includes('environment_intelligence'), 'menu environment_intelligence', mods);
  assert(!mods.includes('quality_intelligence'), 'sem quality_intelligence no perfil', mods);
  const hint = c.contextual_modules_hint || [];
  assert(hint.includes('environmental'), 'hint inclui environmental', hint);
  assert(!hint.includes('spc'), 'hint sem SPC qualidade', hint);
}

function testManagerEnvironmental() {
  section('Gerente Ambiental → environmental');
  const u = {
    id: 'env-mgr-1',
    role: 'gerente',
    job_title: 'Gerente Ambiental',
    department: 'Sustentabilidade e Meio Ambiente'
  };
  const a = axis(u);
  assert(a.functional_axis === 'environmental' || a.functional_axis === 'sustainability', 'eixo ambiental/sustentabilidade', a);
  const c = cfg(u);
  assert(
    c.profile_code === 'manager_environmental' || c.profile_code === 'coordinator_environmental',
    'perfil ambiental gerencial',
    c.profile_code
  );
}

function testEhs() {
  section('EHS → environmental_health_safety');
  const u = { id: 'ehs-1', role: 'coordenador', functional_area: 'environmental_health_safety' };
  const a = axis(u);
  assert(a.functional_axis === 'environmental_health_safety', 'EHS explícito', a);
  assert(a.priority === 1, 'prioridade manual máxima', a);
}

function testSustainabilityExplicit() {
  section('Sustentabilidade explícita');
  const u = { id: 'sus-1', role: 'gerente', functional_area: 'sustainability', department: 'Marketing' };
  const a = axis(u);
  assert(a.functional_axis === 'sustainability', 'sustainability', a);
}

function testQualityStillQuality() {
  section('Qualidade — permanece quality');
  const u = {
    id: 'q-1',
    role: 'coordenador',
    job_title: 'Coordenador de Qualidade',
    department: 'Qualidade'
  };
  const a = axis(u);
  assert(a.functional_axis === 'quality', 'quality', a);
  const c = cfg(u);
  assert(c.profile_code === 'coordinator_quality', 'coordinator_quality', c);
  const mods = c.profile_config?.visible_modules || [];
  assert(mods.includes('quality_intelligence'), 'quality_intelligence presente', mods);
}

function testHrPcpProduction() {
  section('RH, PCP, Produção — domínios preservados');
  assert(axis({ role: 'gerente', department: 'Recursos Humanos' }).functional_axis === 'hr', 'RH', {});
  assert(axis({ role: 'gerente', job_title: 'Analista PCP' }).functional_axis === 'pcp', 'PCP', {});
  assert(
    axis({ role: 'supervisor', job_title: 'Supervisor de Produção' }).functional_axis === 'production',
    'Produção',
    {}
  );
}

function testCoordinatorAloneNotQuality() {
  section('Coordenador genérico — NÃO força quality');
  const u = { id: 'gen-coord', role: 'coordenador', job_title: 'Coordenador', department: 'Operações Gerais' };
  const a = axis(u);
  assert(a.functional_axis !== 'quality', 'coordenador genérico ≠ quality', a);
}

function testManualPriorityOverridesDepartment() {
  section('Área manual tem prioridade sobre departamento');
  const u = {
    id: 'prio-1',
    role: 'coordenador',
    functional_area: 'environmental',
    department: 'Qualidade',
    job_title: 'Coordenador de Qualidade'
  };
  const a = axis(u);
  assert(a.functional_axis === 'environmental', 'manual environmental vence', a);
  assert(a.priority === 1, 'priority 1', a);
}

function testEnvironmentalGuardBlocksQuality() {
  section('Guard ambiental bloqueia quality por “coleta/amostra”');
  const u = {
    id: 'guard-1',
    role: 'coordenador',
    job_title: 'Técnico de Meio Ambiente',
    department: 'Meio Ambiente',
    hr_responsibilities: 'Coleta de amostras de efluentes e análise de ETA'
  };
  const a = axis(u);
  assert(a.functional_axis === 'environmental', 'guard → environmental', a);
  assert(a.environmental_guard === true, 'environmental_guard ativo', a);
}

function testCatalogCompleteness() {
  section('Catálogo — áreas obrigatórias presentes');
  const required = [
    'production',
    'environmental',
    'sustainability',
    'environmental_health_safety',
    'quality',
    'hr',
    'pcp',
    'logistics',
    'utilities',
    'esg'
  ];
  for (const id of required) {
    assert(catalog.isKnownId(id), `id conhecido: ${id}`, {});
  }
  const select = catalog.listForAdminSelect();
  assert(select.length >= 25, 'select admin com cobertura ampla', { count: select.length });
}

function testRetrocompatOperationsDefault() {
  section('Retrocompat — liderança neutra sem quality');
  const u = { id: 'retro-1', role: 'gerente', job_title: 'Gerente', department: '' };
  const a = axis(u);
  assert(a.functional_axis !== 'quality', 'gerente genérico ≠ quality', a);
  assert(
    ['operations', 'production', 'pcp'].includes(a.functional_axis),
    'default liderança neutra (operations/production/pcp via Motor B)',
    a
  );
}

function main() {
  testCoordinatorEnvironmental();
  testManagerEnvironmental();
  testEhs();
  testSustainabilityExplicit();
  testQualityStillQuality();
  testHrPcpProduction();
  testCoordinatorAloneNotQuality();
  testManualPriorityOverridesDepartment();
  testEnvironmentalGuardBlocksQuality();
  testCatalogCompleteness();
  testRetrocompatOperationsDefault();
  console.log(`\nTotal: ${_passed} passed | ${_failed} failed`);
  if (_failed > 0) process.exit(1);
  const evidence = cfg({
    id: 'evidence-env',
    role: 'coordenador',
    job_title: 'Coordenador de Meio Ambiente',
    department: 'Meio Ambiente',
    area: 'meio ambiente'
  });
  console.log('\n[Evidência JSON — utilizador ambiental]');
  console.log(
    JSON.stringify(
      {
        functional_axis: evidence.functional_axis,
        dashboard_profile: evidence.profile_code,
        department: 'Meio Ambiente',
        contextual_modules: evidence.contextual_modules_hint,
        visible_modules: evidence.profile_config?.visible_modules
      },
      null,
      2
    )
  );
}

main();
