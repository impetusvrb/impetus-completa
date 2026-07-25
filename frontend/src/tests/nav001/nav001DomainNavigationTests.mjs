/**
 * NAV-001 — Domain navigation tests (multi-profile segregation).
 */
import assert from 'node:assert/strict';
import { resolveAllowedPresentationDomains, isPresentationDomainAllowed } from '../../presentation/navigation/domainNavigationResolver.js';
import { buildPresentationNavigationSections } from '../../presentation/navigation/presentationNavigationRegistry.js';
import { mergePresentationNavigationIntoMenu } from '../../presentation/navigation/mergePresentationNavigation.js';

const ALL_MODULES = Object.freeze([
  'logistics_intelligence',
  'quality_intelligence',
  'environment_intelligence',
  'safety_intelligence'
]);

const WAREHOUSE_MANAGER = Object.freeze({
  role: 'gerente',
  functional_area: 'logistics',
  dashboard_profile: 'warehouse_manager',
  profile_code: 'warehouse_manager',
  wms_profile: 'warehouse_manager',
  job_title: 'Warehouse Manager'
});

const QUALITY_MANAGER = Object.freeze({
  role: 'gerente',
  functional_area: 'quality',
  dashboard_profile: 'manager_quality',
  profile_code: 'manager_quality',
  job_title: 'Gerente Qualidade'
});

const ENV_COORDINATOR = Object.freeze({
  role: 'coordenador',
  functional_area: 'environmental',
  dashboard_profile: 'coordinator_environmental',
  job_title: 'Coordenador Meio Ambiente',
  structural_profile: { eixo_primario: 'eixo_ambiental' }
});

const PRODUCTION_OPERATOR = Object.freeze({
  role: 'operador',
  functional_area: 'production',
  job_title: 'Operador de Produção'
});

const MARKETING_ANALYST = Object.freeze({
  role: 'colaborador',
  functional_area: 'marketing',
  job_title: 'Analista de Marketing'
});

const SAFETY_TECH = Object.freeze({
  role: 'tecnico',
  functional_area: 'SST',
  dashboard_profile: 'safety_technician',
  job_title: 'Técnico de Segurança do Trabalho',
  structural_profile: { eixo_primario: 'eixo_seguranca' }
});

function ctx(user, visibleModules = ALL_MODULES) {
  return { user, visibleModules, suppressDomainSections: false };
}

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

console.log('NAV-001 — Domain Navigation Tests\n');

test('Warehouse Manager: LOGÍSTICA ✔ QUALIDADE ✖', () => {
  const c = ctx(WAREHOUSE_MANAGER);
  assert.equal(isPresentationDomainAllowed('logistics_wms', c), true);
  assert.equal(isPresentationDomainAllowed('quality', c), false);
  const domains = resolveAllowedPresentationDomains(c);
  assert.ok(domains.includes('logistics_wms'));
  assert.ok(!domains.includes('quality'));
});

test('Gerente Qualidade: QUALIDADE ✔ LOGÍSTICA ✖', () => {
  const c = ctx(QUALITY_MANAGER);
  assert.equal(isPresentationDomainAllowed('quality', c), true);
  assert.equal(isPresentationDomainAllowed('logistics_wms', c), false);
});

test('Coordenador Meio Ambiente: MEIO AMBIENTE ✔ LOGÍSTICA ✖', () => {
  const c = ctx(ENV_COORDINATOR);
  assert.equal(isPresentationDomainAllowed('environment', c), true);
  assert.equal(isPresentationDomainAllowed('logistics_wms', c), false);
});

test('Operador Produção: sem LOGÍSTICA / QUALIDADE operacionais', () => {
  const c = ctx(PRODUCTION_OPERATOR);
  assert.equal(isPresentationDomainAllowed('logistics_wms', c), false);
  assert.equal(isPresentationDomainAllowed('quality', c), false);
  assert.equal(isPresentationDomainAllowed('environment', c), false);
});

test('Marketing: nenhum domínio operacional industrial', () => {
  const c = ctx(MARKETING_ANALYST);
  const domains = resolveAllowedPresentationDomains(c);
  assert.deepEqual(domains, []);
});

test('Técnico Segurança: SEGURANÇA ✔ LOGÍSTICA ✖', () => {
  const c = ctx(SAFETY_TECH);
  assert.equal(isPresentationDomainAllowed('safety', c), true);
  assert.equal(isPresentationDomainAllowed('logistics_wms', c), false);
});

test('merge sidebar: Qualidade não recebe secção LOGÍSTICA', () => {
  const base = [{ path: '/app', label: 'Dashboard' }];
  const merged = mergePresentationNavigationIntoMenu(base, ctx(QUALITY_MANAGER));
  const logisticsHeader = merged.some((i) => i.label === 'LOGÍSTICA');
  assert.equal(logisticsHeader, false);
});

test('buildPresentationNavigationSections resolves per domain (not merge all)', () => {
  const sections = buildPresentationNavigationSections(ctx(QUALITY_MANAGER));
  const ids = sections.map((s) => s.domainId);
  assert.ok(!ids.includes('logistics_wms'));
});

test('CEO/diretor: suppressDomainSections bloqueia navegação operacional', () => {
  const c = { user: WAREHOUSE_MANAGER, visibleModules: ALL_MODULES, suppressDomainSections: true };
  assert.deepEqual(resolveAllowedPresentationDomains(c), []);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
