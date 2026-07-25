/**
 * FIN-STAB-001 — Finance Domain Production Stabilization & Operational Certification.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FINANCE_DOMAIN_IDENTITY,
  FINANCE_EOX_DOMAIN_ENTRY,
  validateFinanceDomainMetadata,
  FIN_STAB_001_PHASE as IDENTITY_STAB_PHASE
} from '../../domains/finance/metadata/financeDomainMetadata.js';
import {
  FINANCE_SIDEBAR_MENU_ITEMS,
  FINANCE_OFFICIAL_DEEP_LINKS,
  FINANCE_CONTEXTUAL_MENU_OVERRIDES,
  buildFinanceBreadcrumb,
  buildFinanceEoxNavigationConfig
} from '../../domains/finance/metadata/financeNavigationMetadata.js';
import {
  FINANCE_LEGACY_REDIRECTS,
  resolveLegacyFinanceRedirect,
  validateFinanceLegacyCompatibility
} from '../../domains/finance/compatibility/financeLegacyCompatibility.js';
import { FINANCE_WORKSPACE_INTEGRATIONS } from '../../domains/finance/integration/financeIntegrationLayer.js';
import {
  canAccessFinanceDomain,
  canAccessFinanceDomainMenu,
  canAccessFinanceBilling
} from '../../domains/finance/navigation/financeAccess.js';
import { resolveDefaultAppPath } from '../../utils/defaultAppEntry.js';
import { FINANCE_EVENTS } from '../../domains/finance/observability/financeObservability.js';
import {
  FIN_STAB_001_PHASE,
  FIN_STAB_001_PRINCIPLE,
  FIN_STAB_001_CFO_JOURNEYS,
  FIN_STAB_001_GATE_FOR_EVOLVE_002,
  validateFinStab001CertificationSnapshot
} from '../../platform/planning/fin-stab-001/index.js';
import { EOX_DOMAIN_REGISTRY } from '../../presentation/eox/eoxRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const REPO = path.join(FE, '..');
const DOCS = path.join(FE, 'docs/evidence/FIN-STAB-001');

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

console.log('FIN-STAB-001 — finStab001.test\n');

test('STABILIZE BEFORE EXPAND principle', () => {
  assert.equal(FIN_STAB_001_PHASE, 'FIN-STAB-001');
  assert.equal(FIN_STAB_001_PRINCIPLE, 'STABILIZE BEFORE EXPAND');
  assert.equal(IDENTITY_STAB_PHASE, 'FIN-STAB-001');
});

test('Hub Finance — identity single source of truth', () => {
  assert.equal(FINANCE_DOMAIN_IDENTITY.displayName, 'Finance');
  assert.equal(FINANCE_DOMAIN_IDENTITY.landingRoute, '/app/finance');
  assert.equal(FINANCE_EOX_DOMAIN_ENTRY.label, 'Finance');
  assert.equal(EOX_DOMAIN_REGISTRY.finance.label, 'Finance');
  const meta = validateFinanceDomainMetadata();
  assert.equal(meta.valid, true, meta.issues.join('; '));
});

test('landing by finance profile → Hub Finance', () => {
  assert.equal(
    resolveDefaultAppPath({ role: 'diretor', dashboard_profile: 'finance_management' }),
    '/app/finance'
  );
  assert.equal(
    resolveDefaultAppPath({ role: 'diretor', job_title: 'Diretor Financeiro' }),
    '/app/finance'
  );
  assert.equal(resolveDefaultAppPath({ role: 'ceo' }), '/app');
  assert.equal(resolveDefaultAppPath({ role: 'diretor', job_title: 'Diretor Industrial' }), '/app');
});

test('navigation — menu, deep-links, breadcrumbs', () => {
  assert.equal(FINANCE_SIDEBAR_MENU_ITEMS[0].label, 'Finance');
  assert.equal(FINANCE_SIDEBAR_MENU_ITEMS[0].path, '/app/finance');
  assert.equal(FINANCE_CONTEXTUAL_MENU_OVERRIDES.financial_intelligence.label, 'Finance');
  assert.equal(FINANCE_OFFICIAL_DEEP_LINKS.cost_center, '/app/finance/costs');
  assert.equal(FINANCE_OFFICIAL_DEEP_LINKS.leak_map, '/app/finance/leakage');
  const crumbs = buildFinanceBreadcrumb({ id: 'costs', label: 'Centro de Custos Industriais' });
  assert.equal(crumbs[1].label, 'Finance');
  assert.equal(crumbs[2].label, 'Centro de Custos Industriais');
  const eox = buildFinanceEoxNavigationConfig('/app/finance/leakage');
  assert.equal(eox.domain, 'Finance');
});

test('legacy redirects registered in App.jsx', () => {
  const legacy = validateFinanceLegacyCompatibility();
  assert.equal(legacy.valid, true, legacy.issues.join('; '));
  assert.equal(resolveLegacyFinanceRedirect('/app/centro-custos-industriais'), '/app/finance/costs');
  assert.equal(resolveLegacyFinanceRedirect('/app/mapa-vazamento-financeiro'), '/app/finance/leakage');
  const app = fs.readFileSync(path.join(FE, 'src/App.jsx'), 'utf8');
  assert.ok(app.includes('Navigate to="/app/finance/costs"'));
  assert.ok(app.includes('Navigate to="/app/finance/leakage"'));
});

test('RBAC — CEO / Diretor Financeiro / denied', () => {
  assert.equal(canAccessFinanceDomain({ role: 'ceo' }), true);
  assert.equal(
    canAccessFinanceDomainMenu(
      { role: 'diretor', dashboard_profile: 'finance_management' },
      ['financial_intelligence', 'operational']
    ),
    true
  );
  assert.equal(canAccessFinanceBilling({ role: 'diretor', dashboard_profile: 'finance_management' }), true);
  assert.equal(canAccessFinanceDomain({ role: 'colaborador' }), false);
  assert.equal(canAccessFinanceDomainMenu({ role: 'diretor' }, ['operational']), false);
});

test('integration — reuse only, no duplicate engines', () => {
  const comps = FINANCE_WORKSPACE_INTEGRATIONS.map((m) => m.component);
  assert.ok(comps.includes('CentroCustosExecutivo'));
  assert.ok(comps.includes('MapaVazamentoFinanceiro'));
  assert.ok(comps.includes('NexusIACustos'));
  assert.ok(FINANCE_EVENTS.WORKSPACE_VIEW);
  assert.ok(FINANCE_EVENTS.CAPABILITY_NAVIGATE);
});

test('finance_management profile includes financial_intelligence', () => {
  const src = fs.readFileSync(
    path.join(REPO, 'backend/src/config/dashboardProfiles.js'),
    'utf8'
  );
  assert.ok(src.includes("profile_code: 'finance_management'"));
  assert.ok(src.includes("'financial_intelligence'"));
});

test('cadastro label Finance — no Inteligência Financeira', () => {
  const src = fs.readFileSync(
    path.join(REPO, 'backend/src/services/structuralCadastroModuleResolver.js'),
    'utf8'
  );
  assert.ok(src.includes("financial_intelligence: 'Finance'"));
  assert.ok(!src.includes("financial_intelligence: 'Inteligência Financeira'"));
});

test('useVisibleModules finance path stability helpers', () => {
  const src = fs.readFileSync(path.join(FE, 'src/hooks/useVisibleModules.js'), 'utf8');
  assert.ok(src.includes('isFinanceOfficialPath'));
  assert.ok(src.includes('financeModuleKeysAllow'));
  assert.ok(src.includes("'/app/finance': 'financial_intelligence'"));
});

test('CFO journeys — success metrics for Release 2.0 gate', () => {
  assert.equal(FIN_STAB_001_CFO_JOURNEYS.length, 5);
  const ids = FIN_STAB_001_CFO_JOURNEYS.map((j) => j.id);
  assert.deepEqual(ids, ['enter_hub', 'open_costs', 'open_leakage', 'return_hub', 'access_via_menu']);
  assert.equal(FIN_STAB_001_GATE_FOR_EVOLVE_002.nextProgram, 'FIN-EVOLVE-002');
  assert.equal(FIN_STAB_001_GATE_FOR_EVOLVE_002.nextRelease, '2.0');
  const snap = validateFinStab001CertificationSnapshot();
  assert.equal(snap.valid, true, snap.issues.join('; '));
});

test('documentation deliverables', () => {
  const docs = [
    'FIN-STAB-001-WORKSPACE-CERTIFICATION.md',
    'FIN-STAB-001-NAVIGATION.md',
    'FIN-STAB-001-RBAC.md',
    'FIN-STAB-001-INTEGRATION.md',
    'FIN-STAB-001-UX.md',
    'FIN-STAB-001-PRODUCTION-VALIDATION.md',
    'FIN-STAB-001-CERTIFICATION.md',
    'FIN-STAB-001-EXECUTIVE-SUMMARY.md'
  ];
  for (const doc of docs) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), `missing ${doc}`);
  }
});

test('no FIN-PLAN capabilities implemented in this phase', () => {
  const forbidden = [
    'smartCostingEngine',
    'financialDigitalTwinEngine',
    'financeWhatIfEngine'
  ];
  const financeRoot = path.join(FE, 'src/domains/finance');
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(js|jsx)$/.test(name)) {
        const t = fs.readFileSync(p, 'utf8');
        for (const f of forbidden) {
          assert.ok(!t.includes(f), `${name} must not implement ${f}`);
        }
      }
    }
  };
  walk(financeRoot);
});

console.log(`\nFIN-STAB-001: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
