/**
 * FIN-EVOLVE-001A — Domain Experience Consolidation tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFinanceDomainMetadata } from '../../domains/finance/metadata/financeDomainMetadata.js';
import {
  FIN_EVOLVE_001A_PHASE,
  FINANCE_DOMAIN_IDENTITY,
  FINANCE_EOX_DOMAIN_ENTRY
} from '../../domains/finance/metadata/financeDomainMetadata.js';
import {
  FINANCE_BASE_PATH,
  FINANCE_SIDEBAR_MENU_ITEMS,
  FINANCE_OFFICIAL_DEEP_LINKS,
  FINANCE_CONTEXTUAL_MENU_OVERRIDES,
  buildFinanceBreadcrumb,
  buildFinanceEoxNavigationConfig,
  getFinanceOfficialRoute
} from '../../domains/finance/metadata/financeNavigationMetadata.js';
import {
  FINANCE_LEGACY_REDIRECTS,
  resolveLegacyFinanceRedirect,
  validateFinanceLegacyCompatibility
} from '../../domains/finance/compatibility/financeLegacyCompatibility.js';
import { resolveFinanceWorkspace } from '../../domains/finance/experience/financeWorkspaceResolver.js';
import { EOX_DOMAIN_REGISTRY } from '../../presentation/eox/eoxRegistry.js';
import { COGNITIVE_CENTER_RETURN } from '../../presentation/eox/eoxTokens.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const DOCS = path.join(FE, 'docs/evidence/FIN-EVOLVE-001A');

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

console.log('FIN-EVOLVE-001A — finEvolve001a.test\n');

test('ONE DOMAIN · ONE IDENTITY — unified displayName', () => {
  assert.equal(FINANCE_DOMAIN_IDENTITY.displayName, 'Finance');
  assert.equal(FINANCE_DOMAIN_IDENTITY.shortName, 'Finance');
  assert.equal(FINANCE_EOX_DOMAIN_ENTRY.label, 'Finance');
  assert.equal(EOX_DOMAIN_REGISTRY.finance.label, 'Finance');
  const meta = validateFinanceDomainMetadata();
  assert.equal(meta.valid, true, meta.issues.join('; '));
});

test('single metadata provider structure', () => {
  for (const dir of ['metadata', 'experience', 'compatibility']) {
    assert.ok(fs.existsSync(path.join(FE, 'src/domains/finance', dir)), dir);
  }
  assert.ok(fs.existsSync(path.join(FE, 'src/domains/finance/metadata/financeDomainMetadata.js')));
  assert.ok(fs.existsSync(path.join(FE, 'src/domains/finance/metadata/financeNavigationMetadata.js')));
  assert.ok(fs.existsSync(path.join(FE, 'src/domains/finance/experience/financeWorkspaceResolver.js')));
  assert.ok(fs.existsSync(path.join(FE, 'src/domains/finance/compatibility/financeLegacyCompatibility.js')));
});

test('navigation metadata — menu consumes official routes', () => {
  assert.equal(FINANCE_SIDEBAR_MENU_ITEMS[0].path, FINANCE_BASE_PATH);
  assert.equal(FINANCE_SIDEBAR_MENU_ITEMS[0].label, 'Finance');
});

test('breadcrumb standard — Centro Cognitivo → Finance → Módulo', () => {
  const hub = buildFinanceBreadcrumb();
  assert.equal(hub[0].label, COGNITIVE_CENTER_RETURN.shortLabel);
  assert.equal(hub[1].label, 'Finance');
  const costsMod = { id: 'costs', label: 'Centro de Custos Industriais' };
  const crumbs = buildFinanceBreadcrumb(costsMod);
  assert.equal(crumbs.length, 3);
  assert.equal(crumbs[2].label, 'Centro de Custos Industriais');
  assert.equal(crumbs[2].current, true);
});

test('EOX navigation config uses metadata breadcrumb', () => {
  const cfg = buildFinanceEoxNavigationConfig('/app/finance/costs');
  assert.equal(cfg.domain, 'Finance');
  assert.equal(cfg.breadcrumb[0].label, COGNITIVE_CENTER_RETURN.shortLabel);
  assert.equal(cfg.breadcrumb[1].label, 'Finance');
});

test('official deep-links — widgets point to /app/finance/*', () => {
  assert.equal(FINANCE_OFFICIAL_DEEP_LINKS.cost_center, '/app/finance/costs');
  assert.equal(FINANCE_OFFICIAL_DEEP_LINKS.leak_map, '/app/finance/leakage');
  assert.equal(getFinanceOfficialRoute('leakage'), '/app/finance/leakage');
  const centerWidget = fs.readFileSync(
    path.join(FE, 'src/features/dashboard/widgets/CenterWidget.jsx'),
    'utf8'
  );
  assert.ok(centerWidget.includes('FINANCE_OFFICIAL_DEEP_LINKS'));
  assert.ok(centerWidget.includes('cost_center: FINANCE_OFFICIAL_DEEP_LINKS.cost_center'));
  assert.ok(centerWidget.includes('leak_map: FINANCE_OFFICIAL_DEEP_LINKS.leak_map'));
});

test('contextual modules — no Inteligência Financeira label', () => {
  assert.equal(FINANCE_CONTEXTUAL_MENU_OVERRIDES.financial_intelligence.label, 'Finance');
  assert.equal(FINANCE_CONTEXTUAL_MENU_OVERRIDES.financial_intelligence.path, '/app/finance');
  const builder = fs.readFileSync(path.join(FE, 'src/utils/contextualSidebarBuilder.js'), 'utf8');
  assert.ok(!builder.includes('Inteligência Financeira'));
});

test('legacy compatibility — redirect registry', () => {
  const legacy = validateFinanceLegacyCompatibility();
  assert.equal(legacy.valid, true, legacy.issues.join('; '));
  assert.equal(resolveLegacyFinanceRedirect('/app/centro-custos-industriais'), '/app/finance/costs');
  assert.equal(resolveLegacyFinanceRedirect('/app/mapa-vazamento-financeiro'), '/app/finance/leakage');
  assert.equal(FINANCE_LEGACY_REDIRECTS.length, 3);
  const app = fs.readFileSync(path.join(FE, 'src/App.jsx'), 'utf8');
  for (const entry of FINANCE_LEGACY_REDIRECTS) {
    assert.ok(app.includes(entry.from), entry.from);
    assert.ok(app.includes(entry.to), entry.to);
  }
});

test('workspace resolver — hierarchical modules', () => {
  const ws = resolveFinanceWorkspace({ role: 'ceo' });
  assert.equal(ws.domain.displayName, 'Finance');
  const ids = ws.modules.map((m) => m.id);
  assert.ok(ids.includes('costs'));
  assert.ok(ids.includes('leakage'));
  assert.ok(ids.includes('billing'));
  assert.ok(ids.includes('ledger'));
  assert.ok(ids.includes('wallet'));
});

test('integrity validation FIN-EVOLVE-001A', () => {
  const meta = validateFinanceDomainMetadata();
  const legacy = validateFinanceLegacyCompatibility();
  assert.equal(meta.valid, true, meta.issues.join('; '));
  assert.equal(legacy.valid, true, legacy.issues.join('; '));
});

test('FIN-EVOLVE-001A documentation deliverables', () => {
  const docs = [
    'FIN-EVOLVE-001A-DOMAIN-IDENTITY.md',
    'FIN-EVOLVE-001A-NAVIGATION.md',
    'FIN-EVOLVE-001A-WORKSPACE.md',
    'FIN-EVOLVE-001A-LEGACY-COMPATIBILITY.md',
    'FIN-EVOLVE-001A-DOMAIN-METADATA.md',
    'FIN-EVOLVE-001A-EXECUTIVE-SUMMARY.md'
  ];
  for (const doc of docs) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), `missing ${doc}`);
  }
});

console.log(`\nFIN-EVOLVE-001A: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
