'use strict';

/**
 * Cenários do Policy Hardening Engine (sem DB).
 * Executar: node src/tests/policyHardeningScenarios.js
 */

const assert = require('assert');
const {
  mergePoliciesWithHardening,
  deepMergePolicies,
  enforceLockedRules,
  resolveMostRestrictiveRule,
  unwrapRulesForEnforcement
} = require('../services/policyHardeningService');

function testLockedCompanyCannotOverrideGlobal() {
  const global = {
    block_sensitive_data: { value: true, locked: true }
  };
  const company = { block_sensitive_data: { value: false, locked: false } };
  const { merged, policy_enforcement } = mergePoliciesWithHardening([global, company]);
  const rules = unwrapRulesForEnforcement(merged);
  assert.strictEqual(rules.block_sensitive_data, true, 'valor locked do nível superior deve prevalecer');
  assert.strictEqual(policy_enforcement.conflict_detected, true);
  assert.strictEqual(policy_enforcement.resolved_by, 'locked_precedence');
  assert.ok(policy_enforcement.affected_rules.includes('block_sensitive_data'));
}

function testCountryVsCompanyMostRestrictive() {
  const country = { block_sensitive_data: true };
  const company = { block_sensitive_data: false };
  const { merged, policy_enforcement } = mergePoliciesWithHardening([country, company]);
  const rules = unwrapRulesForEnforcement(merged);
  assert.strictEqual(rules.block_sensitive_data, true);
  assert.strictEqual(policy_enforcement.conflict_detected, true);
  assert.strictEqual(policy_enforcement.resolved_by, 'most_restrictive');
}

function testDeepMergeMultipleLevels() {
  const a = { limits: { day: 1, deep: { x: 1 } } };
  const b = { limits: { night: 2, deep: { y: 2 } } };
  const { merged } = mergePoliciesWithHardening([a, b]);
  assert.strictEqual(merged.limits.day, 1);
  assert.strictEqual(merged.limits.night, 2);
  assert.strictEqual(merged.limits.deep.x, 1);
  assert.strictEqual(merged.limits.deep.y, 2);
}

function testNoConflictUnchanged() {
  const only = { require_human_validation: true, allowed_modules: ['cognitive_council'] };
  const { merged, policy_enforcement } = mergePoliciesWithHardening([only]);
  const rules = unwrapRulesForEnforcement(merged);
  assert.strictEqual(rules.require_human_validation, true);
  assert.deepStrictEqual(rules.allowed_modules, ['cognitive_council']);
  assert.strictEqual(policy_enforcement.conflict_detected, false);
  assert.strictEqual(policy_enforcement.resolved_by, null);
  assert.deepStrictEqual(policy_enforcement.affected_rules, []);
}

function testDeepMergeArraysReplaced() {
  const base = { allowed_modules: ['a', 'b'] };
  const over = { allowed_modules: ['c'] };
  const m = deepMergePolicies(base, over);
  assert.deepStrictEqual(m.allowed_modules, ['c']);
}

function testEnforceLockedRulesStandalone() {
  const base = { block_sensitive_data: { value: true, locked: true } };
  const incoming = { block_sensitive_data: { value: false } };
  const { merged, corrections } = enforceLockedRules(base, incoming);
  assert.ok(corrections.includes('block_sensitive_data'));
  assert.strictEqual(merged.block_sensitive_data.value, true);
  assert.strictEqual(merged.block_sensitive_data.locked, true);
}

function testResolveMostRestrictiveRule() {
  assert.strictEqual(resolveMostRestrictiveRule('sensitive_data_action', 'anonymize', 'block'), 'block');
  assert.strictEqual(resolveMostRestrictiveRule('max_response_detail', 'high', 'low'), 'low');
  assert.strictEqual(resolveMostRestrictiveRule('block_sensitive_data', false, true), true);
  assert.strictEqual(resolveMostRestrictiveRule('require_human_validation', false, true), true);
}

const suite = [
  testLockedCompanyCannotOverrideGlobal,
  testCountryVsCompanyMostRestrictive,
  testDeepMergeMultipleLevels,
  testNoConflictUnchanged,
  testDeepMergeArraysReplaced,
  testEnforceLockedRulesStandalone,
  testResolveMostRestrictiveRule
];

let failed = false;
for (const t of suite) {
  try {
    t();
    console.log('OK', t.name);
  } catch (e) {
    failed = true;
    console.error('FAIL', t.name, e.message);
  }
}
if (failed) process.exit(1);
console.log('policyHardeningScenarios: all passed');
