/**
 * Regression — Finance access for Diretor Financeiro after FIN-EVOLVE-001A.
 * Static checks on useVisibleModules mapping + financeAccess policy (no JSX/API import).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canAccessFinanceDomain,
  canAccessFinanceDomainMenu
} from '../../domains/finance/navigation/financeAccess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');

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

const diretorFinanceiro = {
  role: 'diretor',
  dashboard_profile: 'finance_management',
  job_title: 'Diretor Financeiro'
};

console.log('Finance access regression — diretor financeiro\n');

test('canAccessFinanceDomain — diretor finance_management', () => {
  assert.equal(canAccessFinanceDomain(diretorFinanceiro), true);
});

test('canAccessFinanceDomain — diretor via job_title financeiro', () => {
  assert.equal(
    canAccessFinanceDomain({ role: 'diretor', job_title: 'Diretor Financeiro' }),
    true
  );
});

test('canAccessFinanceDomainMenu — diretor + financial_intelligence', () => {
  assert.equal(
    canAccessFinanceDomainMenu(diretorFinanceiro, ['financial_intelligence', 'operational']),
    true
  );
});

test('canAccessFinanceDomainMenu — diretor + module without profile in token', () => {
  assert.equal(
    canAccessFinanceDomainMenu({ role: 'diretor' }, ['financial_intelligence']),
    true
  );
});

test('non-finance diretor without finance modules denied', () => {
  assert.equal(canAccessFinanceDomain({ role: 'diretor', job_title: 'Diretor Industrial' }), false);
  assert.equal(canAccessFinanceDomainMenu({ role: 'diretor' }, ['operational']), false);
});

test('useVisibleModules maps /app/finance → financial_intelligence', () => {
  const src = fs.readFileSync(path.join(FE, 'src/hooks/useVisibleModules.js'), 'utf8');
  assert.ok(src.includes("'/app/finance': 'financial_intelligence'"));
  assert.ok(src.includes("'/app/finance/costs': 'financial_intelligence'"));
  assert.ok(src.includes("'/app/finance/leakage': 'financial_intelligence'"));
  assert.ok(src.includes("n.startsWith('/app/finance/')"));
  assert.ok(src.includes("'/app/finance'") && src.includes('CEO_STABLE_MENU_PATHS'));
  assert.ok(src.includes("'/app/finance'") && src.includes('EXECUTIVE_STRATEGIC_PATHS'));
});

test('FinanceOperationalLayout uses canAccessFinanceDomainMenu (aligned to menu)', () => {
  const src = fs.readFileSync(
    path.join(FE, 'src/domains/finance/workspace/FinanceOperationalLayout.jsx'),
    'utf8'
  );
  assert.ok(src.includes('canAccessFinanceDomainMenu'));
  assert.ok(src.includes('readMenuStabilityCache'));
});

console.log(`\nFinance access regression: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
