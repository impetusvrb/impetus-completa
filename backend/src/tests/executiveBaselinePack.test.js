'use strict';

/**
 * EXECUTIVE-BASELINE-001 — Executive Baseline Pack Test Suite
 *
 * Valida:
 * - Baseline aplicado a CEO/diretores (hierarchy ≤ 1) em Modo 2
 * - Gerentes/coordenadores/supervisores/operadores inalterados
 * - Domain isolation preservado
 * - RBAC não alterado (authorize.js intacto)
 *
 * Execução: npm run test:executive-baseline-pack
 */

const cadastro = require('../services/structuralCadastroModuleResolver');
const moduleGov = require('../services/moduleAccessGovernanceEngine');
const executiveBaselinePack = require('../services/executiveBaselinePack');
const { DASHBOARD_PROFILES } = require('../config/dashboardProfiles');
const { DOMAIN_DASHBOARD_PROFILES } = require('../domainAuthority/registry/domainDashboardProfiles');
const authorize = require('../middleware/authorize');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.error(`  ✗ FAIL: ${label}`);
  }
}

function profileMods(code) {
  return (
    DASHBOARD_PROFILES[code]?.visible_modules ||
    DOMAIN_DASHBOARD_PROFILES[code]?.visible_modules ||
    []
  );
}

function buildRoleRow(persona) {
  return {
    name: persona.cargoName || persona.label,
    department_id: 'dept-test',
    sector_id: 'sec-test',
    dashboard_functional_hint: persona.hint,
    hierarchy_level: persona.hierarchy_level,
    access_financial_data: persona.hint === 'finance',
    access_strategic_data: persona.access_strategic !== false,
    access_hr_data: persona.hint === 'hr',
    operational_scope: persona.operational_scope || 'estrategico',
    recommended_permissions: persona.recommended_permissions || [],
    visible_themes: persona.visible_themes || [],
    hidden_themes: persona.hidden_themes || []
  };
}

function resolveVisible(persona) {
  const roleRow = buildRoleRow(persona);
  const authFromCadastro = cadastro.resolveAuthorizedMenuKeysFromCadastro(roleRow);
  const baseline = executiveBaselinePack.mergeExecutiveBaselineIntoAuthorizedKeys(authFromCadastro, {
    structural_complete: true,
    role: persona.role,
    hierarchy_level: persona.hierarchy_level,
    user_id: persona.id || 'test-user'
  });

  const ctx = {
    user_id: persona.id || 'test-user',
    role: persona.role,
    hierarchy_level: persona.hierarchy_level,
    dashboard_profile: persona.profile,
    structural_role: roleRow,
    structural_complete: true,
    authorized_menu_keys: baseline.keys,
    executive_baseline: {
      applied: baseline.applied,
      baseline_modules: baseline.baseline_modules
    },
    functional_area: persona.hint,
    hidden_themes: [],
    organizational_context: { valid: true }
  };

  const legacy = profileMods(persona.profile);
  const out = moduleGov.resolveGovernedVisibleModules(ctx, legacy);
  return { visible: out.visible_modules, ctx, baseline, authFromCadastro };
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  IMPETUS — Executive Baseline Pack Tests');
console.log('══════════════════════════════════════════════════════════════\n');

/* ── Unit: eligibility ── */
console.log('--- Eligibility ---');

assert(
  executiveBaselinePack.isExecutiveBaselineEligible({ role: 'diretor', hierarchy_level: 1 }).eligible,
  'diretor hl=1 elegível'
);
assert(
  executiveBaselinePack.isExecutiveBaselineEligible({ role: 'ceo', hierarchy_level: 0 }).eligible,
  'ceo hl=0 elegível'
);
assert(
  !executiveBaselinePack.isExecutiveBaselineEligible({ role: 'gerente', hierarchy_level: 2 }).eligible,
  'gerente não elegível'
);
assert(
  !executiveBaselinePack.isExecutiveBaselineEligible({ role: 'diretor', hierarchy_level: 2 }).eligible,
  'diretor hl=2 não elegível'
);
assert(
  !executiveBaselinePack.shouldApplyExecutiveBaseline({ structural_complete: false, role: 'diretor', hierarchy_level: 1 }).apply,
  'Modo 1 não aplica baseline'
);
assert(
  executiveBaselinePack.shouldApplyExecutiveBaseline({ structural_complete: true, role: 'diretor', hierarchy_level: 1 }).apply,
  'Modo 2 diretor aplica baseline'
);

/* ── Executivos ── */
console.log('\n--- Executivos (Modo 2) ---');

const EXECUTIVES = [
  { label: 'CEO', role: 'ceo', profile: 'ceo_executive', hint: 'executive', hierarchy_level: 0 },
  { label: 'Diretor Financeiro', role: 'diretor', profile: 'director_financial', hint: 'finance', hierarchy_level: 1 },
  { label: 'Diretor RH', role: 'diretor', profile: 'director_hr', hint: 'hr', hierarchy_level: 1 },
  { label: 'Diretor Industrial', role: 'diretor', profile: 'director_industrial', hint: 'production', hierarchy_level: 1 },
  { label: 'Diretor Qualidade', role: 'diretor', profile: 'director_industrial', hint: 'quality', hierarchy_level: 1 },
  { label: 'Diretor SST', role: 'diretor', profile: 'director_safety', hint: 'safety', hierarchy_level: 1 },
  { label: 'Diretor Ambiental', role: 'diretor', profile: 'director_industrial', hint: 'environmental', hierarchy_level: 1, access_strategic: false },
  { label: 'Diretor Logística', role: 'diretor', profile: 'director_operations', hint: 'logistics', hierarchy_level: 1 },
  { label: 'Diretor Comercial', role: 'diretor', profile: 'director_operations', hint: 'operations', hierarchy_level: 1 },
  { label: 'Diretor Genérico', role: 'diretor', profile: 'director_unassigned', hint: null, hierarchy_level: 1, cargoName: 'Diretor' }
];

for (const p of EXECUTIVES) {
  const { visible, baseline } = resolveVisible(p);
  assert(visible.includes('ai'), `${p.label}: IA presente`);
  assert(visible.includes('biblioteca'), `${p.label}: Biblioteca presente`);
  assert(baseline.applied || p.hint === 'executive', `${p.label}: baseline aplicado ou CEO hint executive`);
}

assert(
  resolveVisible(EXECUTIVES[1]).visible.includes('financial_intelligence'),
  'Dir. Financeiro: financial_intelligence preservado'
);
assert(
  resolveVisible(EXECUTIVES[2]).visible.includes('hr_intelligence'),
  'Dir. RH: hr_intelligence preservado'
);
assert(
  resolveVisible(EXECUTIVES[4]).visible.includes('quality_intelligence'),
  'Dir. Qualidade: quality_intelligence preservado'
);

/* ── Não executivos ── */
console.log('\n--- Não executivos (sem baseline) ---');

const NON_EXEC = [
  { label: 'Gerente Produção', role: 'gerente', profile: 'manager_production', hint: 'production', hierarchy_level: 2 },
  { label: 'Gerente Qualidade', role: 'gerente', profile: 'manager_quality', hint: 'quality', hierarchy_level: 2 },
  { label: 'Coordenador Qualidade', role: 'coordenador', profile: 'coordinator_quality', hint: 'quality', hierarchy_level: 3 },
  { label: 'Supervisor Operações', role: 'supervisor', profile: 'supervisor_operations', hint: 'operations', hierarchy_level: 4 },
  { label: 'Operador', role: 'operador', profile: 'operator_floor', hint: 'production', hierarchy_level: 5 },
  { label: 'Colaborador', role: 'colaborador', profile: 'operational_base', hint: 'production', hierarchy_level: 5 }
];

for (const p of NON_EXEC) {
  const auth = cadastro.resolveAuthorizedMenuKeysFromCadastro(buildRoleRow(p));
  const baseline = executiveBaselinePack.mergeExecutiveBaselineIntoAuthorizedKeys(auth, {
    structural_complete: true,
    role: p.role,
    hierarchy_level: p.hierarchy_level
  });
  assert(!baseline.applied, `${p.label}: baseline NÃO aplicado`);
}

/* ── Domain isolation ── */
console.log('\n--- Domain isolation ---');

const finManuia = resolveVisible({
  label: 'Dir. Financeiro manuia leak',
  role: 'diretor',
  profile: 'director_financial',
  hint: 'finance',
  hierarchy_level: 1,
  visible_themes: ['Custos de manutenção']
});
assert(!finManuia.visible.includes('manuia'), 'Financeiro: ManuIA negado');

const hrFin = resolveVisible({
  label: 'Dir. RH baseline puro',
  role: 'diretor',
  profile: 'director_hr',
  hint: 'hr',
  hierarchy_level: 1
});
assert(!hrFin.visible.includes('financial_intelligence'), 'RH: Financial Intelligence negado (baseline puro)');

const qualRh = resolveVisible({
  label: 'Dir. Qualidade',
  role: 'diretor',
  profile: 'director_industrial',
  hint: 'quality',
  hierarchy_level: 1
});
assert(!qualRh.visible.includes('hr_intelligence'), 'Qualidade: RH negado');

const sstFin = resolveVisible({
  label: 'Dir. SST',
  role: 'diretor',
  profile: 'director_safety',
  hint: 'safety',
  hierarchy_level: 1
});
assert(!sstFin.visible.includes('financial_intelligence'), 'SST: Financeiro negado');

const ambManuia = resolveVisible({
  label: 'Dir. Ambiental',
  role: 'diretor',
  profile: 'director_industrial',
  hint: 'environmental',
  hierarchy_level: 1,
  access_strategic: false
});
assert(!ambManuia.visible.includes('manuia'), 'Ambiental: ManuIA negado');

/* ── RBAC smoke ── */
console.log('\n--- RBAC (sem alteração) ---');

assert(typeof authorize.userHasPermission === 'function', 'authorize.userHasPermission existe');
assert(typeof authorize.hydrateUserPermissions === 'function', 'hydrateUserPermissions existe');
assert(typeof authorize.getUserPermissions === 'function', 'getUserPermissions existe');
assert(
  !Object.keys(executiveBaselinePack).some((k) => k.toLowerCase().includes('permission')),
  'executiveBaselinePack não exporta helpers RBAC'
);

/* ── Pack content ── */
console.log('\n--- Pack content ---');

const pack = executiveBaselinePack.EXECUTIVE_BASELINE_PACK;
assert(pack.includes('ai') && pack.includes('biblioteca'), 'pack contém ai e biblioteca');
assert(!pack.includes('hr_intelligence'), 'pack não contém hr_intelligence');
assert(!pack.includes('financial_intelligence'), 'pack não contém financial_intelligence');
assert(!pack.includes('manuia'), 'pack não contém manuia');

/* ── Before/after snapshot (Dir. Financeiro vs Gerente) ── */
console.log('\n--- Before × After snapshots ---');

function visibleWithoutBaseline(persona) {
  const roleRow = buildRoleRow(persona);
  const auth = cadastro.resolveAuthorizedMenuKeysFromCadastro(roleRow);
  const ctx = {
    role: persona.role,
    hierarchy_level: persona.hierarchy_level,
    dashboard_profile: persona.profile,
    structural_role: roleRow,
    structural_complete: true,
    authorized_menu_keys: auth,
    functional_area: persona.hint,
    hidden_themes: [],
    organizational_context: { valid: true }
  };
  return moduleGov.resolveGovernedVisibleModules(ctx, profileMods(persona.profile)).visible_modules.sort();
}

const dirFin = { role: 'diretor', profile: 'director_financial', hint: 'finance', hierarchy_level: 1, label: 'Diretor Financeiro' };
const dirRh = { role: 'diretor', profile: 'director_hr', hint: 'hr', hierarchy_level: 1, label: 'Diretor RH' };
const gerente = { role: 'gerente', profile: 'manager_production', hint: 'production', hierarchy_level: 2, label: 'Gerente' };
const coord = { role: 'coordenador', profile: 'coordinator_production', hint: 'production', hierarchy_level: 3, label: 'Coordenador' };

const finBefore = visibleWithoutBaseline(dirFin);
const finAfter = resolveVisible(dirFin).visible.sort();
assert(finBefore.includes('ai') === false && finAfter.includes('ai'), 'Dir. Financeiro: IA restaurada');
assert(finBefore.includes('biblioteca') === false && finAfter.includes('biblioteca'), 'Dir. Financeiro: Biblioteca restaurada');

const rhBefore = visibleWithoutBaseline(dirRh);
const rhAfter = resolveVisible(dirRh).visible.sort();
assert(rhBefore.includes('ai') === false && rhAfter.includes('ai'), 'Dir. RH: IA restaurada');

const gerBefore = visibleWithoutBaseline(gerente);
const gerAfter = resolveVisible(gerente).visible.sort();
assert(JSON.stringify(gerBefore) === JSON.stringify(gerAfter), 'Gerente: inalterado');

const coordBefore = visibleWithoutBaseline(coord);
const coordAfter = resolveVisible(coord).visible.sort();
assert(JSON.stringify(coordBefore) === JSON.stringify(coordAfter), 'Coordenador: inalterado');

console.log('\n  Dir. Financeiro ANTES:', finBefore.join(', '));
console.log('  Dir. Financeiro DEPOIS:', finAfter.join(', '));
console.log('  Gerente ANTES/DEPOIS:', gerBefore.join(', '), '(igual)');

console.log('\n══════════════════════════════════════════════════════════════');
console.log(`  Resultado: ${passed} passed | ${failed} failed`);
console.log('══════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  console.error('Falhas:', failures.join('\n  - '));
  process.exit(1);
}
