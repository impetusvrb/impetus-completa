'use strict';

/**
 * Segregação domínio funcional — pós-incidente cross-domain (2026).
 *
 *   npm run test:domain-isolation
 *   node src/tests/domainIsolationScenarios.js
 */

const path = require('path');
const dashboardAccess = require(path.join('..', 'services', 'dashboardAccessService'));
const { buildContextualIdentity } = require(path.join('..', 'dashboardEngineV2', 'identity', 'identityResolver'));
const { deriveCapabilities } = require(path.join('..', 'dashboardEngineV2', 'axes', 'capabilitiesDeriver'));
const orchestrator = require(path.join('..', 'contextualModules', 'moduleOrchestrator'));
const facade = require(path.join('..', 'contextualModules'));
const { getExpectedDomainMenuKeySet } = require(path.join('..', 'security', 'domainAccessMatrix'));

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
      console.log('        ', JSON.stringify(detail).slice(0, 480));
    } catch (_) {
      /* ignore */
    }
  }
  return false;
}
function section(name) {
  console.log(`\n=== ${name} ===`);
}

const CFO = {
  id: 'iso-cfo',
  company_id: 'co-1',
  role: 'diretor',
  job_title: 'Diretor Financeiro',
  functional_area: 'Financeiro',
  department: 'Diretoria Financeira',
  hierarchy_level: 1,
  permissions: ['VIEW_FINANCIAL', 'VIEW_STRATEGIC', 'VIEW_OPERATIONAL', 'VIEW_DASHBOARD', 'ACCESS_AI_ANALYTICS'],
  dashboard_profile: 'finance_management'
};

const DIR_MAINT = {
  id: 'iso-dm',
  company_id: 'co-1',
  role: 'diretor',
  job_title: 'Diretor de Manutenção',
  functional_area: 'Manutenção',
  department: 'Manutenção Industrial',
  hierarchy_level: 1,
  permissions: ['VIEW_OPERATIONAL', 'VIEW_STRATEGIC', 'VIEW_DASHBOARD', 'ACCESS_AI_ANALYTICS'],
  dashboard_profile: 'director_industrial'
};

const TECH_MAINT = {
  id: 'iso-tm',
  company_id: 'co-1',
  role: 'colaborador',
  job_title: 'Técnico de Manutenção',
  functional_area: 'Manutenção',
  hierarchy_level: 5,
  permissions: ['VIEW_OPERATIONAL', 'VIEW_DASHBOARD'],
  dashboard_profile: 'technician_maintenance'
};

const RH_MGR = {
  id: 'iso-rh',
  company_id: 'co-1',
  role: 'gerente',
  job_title: 'BP RH',
  functional_area: 'Recursos Humanos',
  hierarchy_level: 3,
  permissions: ['VIEW_HR', 'VIEW_OPERATIONAL'],
  dashboard_profile: 'hr_management'
};

function testMotorABaseline() {
  section('Motor A — getAllowedModules sem injecção cross-domain');
  const mFin = dashboardAccess.getAllowedModules(CFO);
  assert(!mFin.includes('manuia'), 'finance_management não inclui manuia', mFin);
  assert(mFin.includes('dashboard'), 'finance inclui dashboard (baseline)', mFin);

  const mTech = dashboardAccess.getAllowedModules(TECH_MAINT);
  assert(!mTech.includes('hr_intelligence'), 'técnico manutenção não inclui hr_intelligence', mTech);
}

function testImplicitCapabilities() {
  section('Capabilities — finance sem view:maintenance implícito');
  const ident = buildContextualIdentity(CFO);
  const caps = new Set(ident.capabilities || []);
  assert(!caps.has('view:maintenance'), 'CFO não recebe view:maintenance implícito', Array.from(caps));

  const dm = buildContextualIdentity(DIR_MAINT);
  const capsM = new Set(dm.capabilities || []);
  assert(!capsM.has('view:financial'), 'Diretor manutenção não recebe view:financial implícito', Array.from(capsM));
}

function testOrchestratorSegregation() {
  section('Orquestrador — CFO sem manutenção/RH');
  const out = orchestrator.orchestrate(buildContextualIdentity(CFO));
  assert(!out.allowed_module_ids.includes('manuia'), 'CFO orchestrate sem manuia', out.allowed_module_ids);
  assert(!out.allowed_module_ids.includes('pulse_rh'), 'CFO orchestrate sem pulse_rh', out.allowed_module_ids);
}

function testEnrichNoLeak() {
  section('Contextual enrich — CFO sem chaves de outro domínio');
  const prev = process.env.IMPETUS_CONTEXTUAL_MODULES;
  process.env.IMPETUS_CONTEXTUAL_MODULES = 'enrich';
  const legacy = ['dashboard', 'operational', 'biblioteca', 'ai', 'settings'];
  const out = facade.enhanceVisibleModulesWithContext(legacy, CFO);
  assert(!out.visibleModules.includes('manuia'), 'enrich: sem manuia no visible_modules', out.visibleModules);
  assert(!out.visibleModules.includes('hr_intelligence'), 'enrich: sem hr_intelligence para CFO', out.visibleModules);
  process.env.IMPETUS_CONTEXTUAL_MODULES = prev;
}

function testMatrixHelper() {
  section('domainAccessMatrix — conjuntos de referência');
  const s = getExpectedDomainMenuKeySet(CFO);
  assert(s.has('dashboard') && s.has('operational'), 'matriz esperada finance cobre dashboard+operational', Array.from(s));
}

function testDeriveCapabilitiesHrOperational() {
  section('RH analise — view:operational presente (menu operacional)');
  const ident = buildContextualIdentity(RH_MGR);
  const d = deriveCapabilities({
    functionType: ident.function_type,
    area: ident.area,
    role: ident.role_normalized || 'gerente',
    permissions: RH_MGR.permissions
  });
  assert(d.capabilities.includes('view:operational'), 'RH analise inclui view:operational', d.capabilities);
}

function main() {
  testMotorABaseline();
  testImplicitCapabilities();
  testOrchestratorSegregation();
  testEnrichNoLeak();
  testMatrixHelper();
  testDeriveCapabilitiesHrOperational();
  console.log(`\n${_passed} passed, ${_failed} failed (domain isolation)`);
  process.exit(_failed ? 1 : 0);
}

main();
