'use strict';

/**
 * Fase D — isolamento Safety vs Environmental + runtime guard
 * npm run test:safety-environmental-isolation
 */

const path = require('path');
const dpr = require(path.join('..', '..', 'services', 'dashboardProfileResolver'));
const ehsPub = require(path.join('..', '..', 'domainAuthority/resolvers/ehsPublicationGuard'));
const inh = require(path.join('..', '..', 'domainAuthority/guards/moduleInheritanceGuard'));
const tech = require(path.join('..', '..', 'domainAuthority/guards/technicalRuntimeAccessGuard'));
const fs = require('fs');

let passed = 0;
let failed = 0;
function assert(c, m, d) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
    if (d) console.log('       ', JSON.stringify(d).slice(0, 400));
  }
}

const safetyUser = {
  id: 'sst-1',
  role: 'coordenador',
  job_title: 'Coordenador de Segurança do Trabalho',
  department: 'Segurança do Trabalho',
  functional_area: 'safety'
};

function testSafetyProfile() {
  console.log('\n=== Perfil SST ===');
  const c = dpr.getDashboardConfigForUser(safetyUser);
  assert(c.functional_axis === 'safety', 'axis safety', c);
  assert(c.profile_code === 'coordinator_safety', 'coordinator_safety', c);
  const mods = c.profile_config?.visible_modules || [];
  assert(!mods.includes('environment_intelligence'), 'sem environment_intelligence', mods);
  assert(!mods.includes('quality_intelligence'), 'sem quality_intelligence', mods);
  assert(mods.includes('safety_intelligence'), 'com safety_intelligence', mods);
}

function testEnvironmentPublicationBlocked() {
  console.log('\n=== Publicação ambiental bloqueada para SST ===');
  assert(ehsPub.shouldPublishEnvironmentNavigation(safetyUser) === false, 'no env publication');
  const band = require(path.join('..', '..', 'domains/environment/publication/environmentAudienceResolver'));
  const b = band.resolveEnvironmentAudienceBand(safetyUser);
  assert(b === 'production', 'audience band production not coordinator', b);
}

function testInheritance() {
  console.log('\n=== Herança de módulos ===');
  const r = inh.filterModulesWithInheritance(
    ['safety_intelligence', 'environment_intelligence', 'dashboard'],
    'safety',
    { user_id: 'sst-1' }
  );
  assert(r.modules.includes('safety_intelligence'), 'keeps safety');
  assert(!r.modules.includes('environment_intelligence'), 'blocks environment module');
}

function testTechnicalRuntimeDenied() {
  console.log('\n=== Runtime técnico negado para SST ===');
  const d = tech.evaluateTechnicalRuntimeAccess(safetyUser, { scope: 'environment_connectors_status' });
  assert(d.allowed === false, 'connectors denied');
  const sanitized = tech.sanitizeTechnicalPayload({ mqtt: {}, modbus: {}, primary_table: 'x' }, safetyUser);
  assert(sanitized.technical_detail_available === false, 'sanitized payload');
}

function testEnvironmentalStillWorks() {
  console.log('\n=== Ambiental preservado ===');
  const env = {
    id: 'env-1',
    role: 'coordenador',
    department: 'Meio Ambiente',
    functional_area: 'environmental'
  };
  const c = dpr.getDashboardConfigForUser(env);
  assert(c.functional_axis === 'environmental', 'environmental axis');
  assert(ehsPub.shouldPublishEnvironmentNavigation(env) === true, 'env publication ok');
}

function writeSnapshot() {
  const dir = path.join(__dirname, '..', '..', '..', 'tests', 'domainSnapshots');
  fs.mkdirSync(dir, { recursive: true });
  const snap = dpr.getDashboardConfigForUser(safetyUser);
  const out = {
    functional_axis: snap.functional_axis,
    profile_code: snap.profile_code,
    visible_modules: snap.profile_config?.visible_modules,
    contextual_modules_hint: snap.contextual_modules_hint,
    domain_authority: snap.domain_authority ?
      {
        domain_axis: snap.domain_authority.domain_axis,
        blocked_modules: snap.domain_authority.blocked_modules
      } :
      null
  };
  fs.writeFileSync(path.join(dir, 'safety-coordinator-snapshot.json'), JSON.stringify(out, null, 2));
  console.log('\n  Snapshot written: backend/tests/domainSnapshots/safety-coordinator-snapshot.json');
}

function main() {
  console.log('Safety / Environmental Isolation (Fase D)');
  testSafetyProfile();
  testEnvironmentPublicationBlocked();
  testInheritance();
  testTechnicalRuntimeDenied();
  testEnvironmentalStillWorks();
  writeSnapshot();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
