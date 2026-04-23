'use strict';

/**
 * Context-Aware Policy Engine — testes offline (sem PostgreSQL).
 * Executar: node src/tests/policyContextScenarios.js
 */

const assert = require('assert');
const {
  rowMatchesPolicyContext,
  contextSpecificityScore,
  comparePolicyRows,
  normalizePolicyToken
} = require('../services/policyEngineService');
const { mergePoliciesWithHardening } = require('../services/policyHardeningService');

function testWildcardRowMatchesAnyContext() {
  const row = { module_name: null, user_role: null, operation_type: null };
  assert.strictEqual(rowMatchesPolicyContext(row, { module_name: 'x', user_role: 'y' }), true);
}

function testModuleRowRequiresMatchingModule() {
  const row = { module_name: 'manutencao_ia', user_role: null, operation_type: null };
  assert.strictEqual(rowMatchesPolicyContext(row, { module_name: 'manutencao_ia' }), true);
  assert.strictEqual(rowMatchesPolicyContext(row, { module_name: 'rh' }), false);
  assert.strictEqual(rowMatchesPolicyContext(row, { module_name: null }), false);
}

function testRoleAndOperation() {
  const row = { module_name: null, user_role: 'supervisor', operation_type: 'analysis' };
  assert.strictEqual(
    rowMatchesPolicyContext(row, { module_name: 'm', user_role: 'supervisor', operation_type: 'analysis' }),
    true
  );
  assert.strictEqual(
    rowMatchesPolicyContext(row, { module_name: 'm', user_role: 'operator', operation_type: 'analysis' }),
    false
  );
}

function testSortCompanyGeneralBeforeCompanyModule() {
  const general = {
    id: 'a',
    company_id: 'c1',
    sector: null,
    country_code: null,
    module_name: null,
    user_role: null,
    operation_type: null
  };
  const withMod = {
    id: 'b',
    company_id: 'c1',
    sector: null,
    country_code: null,
    module_name: 'm',
    user_role: null,
    operation_type: null
  };
  assert.ok(comparePolicyRows(general, withMod) < 0);
  assert.ok(contextSpecificityScore(withMod) > contextSpecificityScore(general));
}

function testNormalizeToken() {
  assert.strictEqual(normalizePolicyToken('  AbC  '), 'abc');
  assert.strictEqual(normalizePolicyToken(''), null);
}

function testHardeningMergeStillRestrictive() {
  const { merged } = mergePoliciesWithHardening([
    { block_sensitive_data: true },
    { block_sensitive_data: false }
  ]);
  const v = merged.block_sensitive_data;
  const val = v && typeof v === 'object' && 'value' in v ? v.value : v;
  assert.strictEqual(val, true);
}

const suite = [
  testWildcardRowMatchesAnyContext,
  testModuleRowRequiresMatchingModule,
  testRoleAndOperation,
  testSortCompanyGeneralBeforeCompanyModule,
  testNormalizeToken,
  testHardeningMergeStillRestrictive
];

let failed = false;
for (const t of suite) {
  try {
    t();
    console.log('OK', t.name);
  } catch (e) {
    failed = true;
    console.error('FAIL', t.name, e);
  }
}
if (failed) process.exit(1);
console.log('policyContextScenarios: all passed');
