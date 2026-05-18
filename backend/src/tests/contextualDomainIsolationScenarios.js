'use strict';

/**
 * Isolamento contextual cross-domain (V2) — perfil, área inferida, resumo IA do dashboard vivo.
 *
 *   npm run test:contextual-domain-isolation
 *   node src/tests/contextualDomainIsolationScenarios.js
 *
 * Foco: inferência de `functional_area`, `dashboard_profile`, rótulos de personalização
 * e texto domain-safe em `buildIntelligentSummary` / `canOrchestrate` — sem DB.
 */

const path = require('path');
const dashboardProfileResolver = require(path.join('..', 'services', 'dashboardProfileResolver'));
const { getProfile } = require(path.join('..', 'config', 'dashboardProfiles'));
const liveDashboardService = require(path.join('..', 'services', 'liveDashboardService'));

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

const signals = { tasksOpen: 1, tasksOverdue: 0, alertsOpen: 2 };

function cfg(user) {
  return dashboardProfileResolver.getDashboardConfigForUser(user);
}

function testFinanceDirectorNoOperationsProfile() {
  section('Financeiro — perfil e área sem “Diretor de Operações”');
  const u = {
    id: 'ctx-fin-1',
    company_id: 'c1',
    role: 'diretor',
    job_title: 'CFO',
    functional_area: 'finance',
    department: 'Controladoria',
    dashboard_profile: 'finance_management'
  };
  const c = cfg(u);
  assert(
    c.profile_code === 'finance_management' || c.profile_code === 'director_financial',
    'perfil financeiro formal',
    c
  );
  assert(c.functional_area === 'finance', 'área funcional finance', c);
  const label = (c.profile_config && c.profile_config.label) || '';
  assert(!/opera(ç|c)ões/i.test(label), 'rótulo de perfil não é operações', label);
}

function testAmbiguousDirectorUnassigned() {
  section('Direção ambígua — director_unassigned, sem área inferida');
  const u = {
    id: 'ctx-dir-amb',
    company_id: 'c1',
    role: 'diretor',
    job_title: 'Diretor',
    department: 'Matriz',
    functional_area: null
  };
  const c = cfg(u);
  assert(c.profile_code === 'director_unassigned', 'perfil director_unassigned', c);
  assert(
    c.functional_area == null ||
      c.functional_area === '' ||
      c.functional_area === 'executive',
    'área funcional não forçada para operations/production/quality',
    c.functional_area
  );
  const prof = getProfile(c.profile_code);
  assert(prof.label === 'Direção', 'label de painel “Direção”', prof.label);
}

function testDepartmentFinanceInference() {
  section('Departamento — “Diretoria Financeira” infere finance (não operations)');
  const u = {
    id: 'ctx-dept-fin',
    company_id: 'c1',
    role: 'diretor',
    job_title: 'Diretor',
    department: 'Diretoria Financeira',
    functional_area: null
  };
  const c = cfg(u);
  assert(c.functional_area === 'finance', 'área inferida finance pelo texto do dept', c);
  assert(
    c.profile_code === 'finance_management' || c.profile_code === 'director_financial',
    'perfil finance_management ou director_financial',
    c
  );
}

function testHrDepartmentInference() {
  section('RH — departamento infere hr sem perfil de operações');
  const u = {
    id: 'ctx-rh-1',
    company_id: 'c1',
    role: 'gerente',
    job_title: 'Gerente',
    department: 'Recursos Humanos — People',
    functional_area: null
  };
  const c = cfg(u);
  assert(c.functional_area === 'hr', 'área hr', c);
  assert(
    c.profile_code === 'hr_management' || c.profile_code === 'manager_hr',
    'perfil RH formal',
    c
  );
}

function testMaintenanceDirectorIndustrial() {
  section('Manutenção — diretor de manutenção não recebe finance_management');
  const u = {
    id: 'ctx-maint-1',
    company_id: 'c1',
    role: 'diretor',
    job_title: 'Diretor de Manutenção',
    department: 'PCM',
    functional_area: null
  };
  const c = cfg(u);
  assert(c.profile_code === 'director_industrial', 'perfil director_industrial', c);
  assert(c.profile_code !== 'finance_management', 'não escala para finance', c.profile_code);
}

function testIntelligentSummaryDomainSafe() {
  section('Resumo cognitivo — finance/RH sem frase “alertas operacionais”');
  const base = {
    userName: 'Ana',
    profileLabel: 'Diretor Financeiro',
    areaLabel: 'Finanças',
    deptName: 'CFO',
    jobTitle: 'CFO',
    signals,
    gaps: [],
    sufficiency: 'full'
  };
  const fin = liveDashboardService.buildIntelligentSummary({
    ...base,
    profileCode: 'finance_management',
    functionalArea: 'finance'
  });
  assert(
    !/alertas operacionais/i.test(fin),
    'finance: resumo sem “alertas operacionais”',
    fin.slice(0, 200)
  );
  assert(/alertas relevantes ao seu domínio/i.test(fin), 'finance: copy domain-safe presente', fin.slice(0, 240));

  const hr = liveDashboardService.buildIntelligentSummary({
    ...base,
    profileLabel: 'Gestão de RH',
    areaLabel: 'Recursos Humanos',
    profileCode: 'hr_management',
    functionalArea: 'hr'
  });
  assert(!/alertas operacionais/i.test(hr), 'RH: resumo sem “alertas operacionais”', hr.slice(0, 200));

  const ops = liveDashboardService.buildIntelligentSummary({
    ...base,
    profileLabel: 'Diretor de Operações',
    areaLabel: 'Operações',
    profileCode: 'director_operations',
    functionalArea: 'operations'
  });
  assert(/alertas operacionais abertos/i.test(ops), 'operations: mantém linguagem operacional explícita', ops.slice(0, 220));
}

function testCanOrchestrateDenyByDomain() {
  section('Orquestração — perfis finance/RH/director_unassigned sem plano operacional');
  const uCeo = { role: 'ceo', hierarchy_level: 1 };
  assert(
    !liveDashboardService.canOrchestrate(uCeo, 'finance_management', 'finance'),
    'finance_management não orquestra'
  );
  assert(
    !liveDashboardService.canOrchestrate(uCeo, 'hr_management', 'hr'),
    'hr_management não orquestra'
  );
  assert(
    !liveDashboardService.canOrchestrate(uCeo, 'director_unassigned', null),
    'director_unassigned não orquestra (sem sinal operacional)'
  );
  assert(
    !liveDashboardService.canOrchestrate(uCeo, 'director_operations', 'finance'),
    'área finance bloqueia orquestração mesmo com código director_operations'
  );
  assert(
    liveDashboardService.canOrchestrate(uCeo, 'director_operations', 'operations'),
    'operations explícito continua elegível para CEO + director_operations'
  );
}

function testPersistedOverrideWhenAreaUnknown() {
  section('Override persistido — dashboard_profile válido quando área null');
  const u = {
    id: 'ctx-ovr-1',
    company_id: 'c1',
    role: 'diretor',
    job_title: 'X',
    functional_area: null,
    department: '',
    dashboard_profile: 'finance_management'
  };
  const code = dashboardProfileResolver.resolveDashboardProfile(u);
  assert(code === 'finance_management', 'override finance quando área vazia', code);
}

function main() {
  testFinanceDirectorNoOperationsProfile();
  testAmbiguousDirectorUnassigned();
  testDepartmentFinanceInference();
  testHrDepartmentInference();
  testMaintenanceDirectorIndustrial();
  testIntelligentSummaryDomainSafe();
  testCanOrchestrateDenyByDomain();
  testPersistedOverrideWhenAreaUnknown();
  console.log(`\nTotal: ${_passed} passed | ${_failed} failed`);
  if (_failed > 0) process.exit(1);
}

main();
