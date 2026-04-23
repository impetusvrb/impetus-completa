'use strict';

/**
 * Advanced Compliance — testes offline (sem PostgreSQL obrigatório).
 * Executar: node src/tests/advancedComplianceScenarios.js
 */

const assert = require('assert');
const dataClassificationService = require('../services/dataClassificationService');
const complianceDecisionService = require('../services/complianceDecisionService');
const dataLifecycleService = require('../services/dataLifecycleService');

function testClassificationAdvancedCategories() {
  const r = dataClassificationService.classifyData({
    prompt: 'sensor na linha 3 com OEE 0.82',
    model_answer: 'operacional'
  });
  assert.ok(Array.isArray(r.data_categories));
  assert.ok(r.primary_category);
  assert.ok(r.data_categories.includes('OPERATIONAL'));
}

function testPlanComplianceForceAnonymizePolicy() {
  const low = {
    contains_personal_data: false,
    contains_sensitive_data: false,
    detected_fields: [],
    risk_level: 'LOW'
  };
  const plan = complianceDecisionService.planCompliance(low, {
    adaptiveResponseMode: 'full',
    policyRules: { compliance_force_anonymize: true }
  });
  assert.strictEqual(plan.shouldAnonymize, true);
}

function testPlanComplianceCriticalUnchanged() {
  const c = {
    contains_personal_data: true,
    contains_sensitive_data: true,
    detected_fields: ['cpf'],
    risk_level: 'CRITICAL'
  };
  const plan = complianceDecisionService.planCompliance(c, { adaptiveResponseMode: 'full' });
  assert.strictEqual(plan.criticalCombo, true);
  const d = complianceDecisionService.evaluateComplianceDecision(c, { adaptiveResponseMode: 'full' });
  assert.strictEqual(d.decision, 'BLOCK');
}

function testRetentionPolicyDefaults() {
  const p = dataLifecycleService.getRetentionPolicy();
  assert.ok(p.retention_policy.trace >= 7);
  assert.ok(p.retention_policy.audit_logs >= 30);
}

function testMergePolicyRetention() {
  const m = dataLifecycleService.mergePolicyRetention({
    data_retention_trace_days: 14,
    data_retention_audit_days: 120
  });
  assert.strictEqual(m.trace, 14);
  assert.strictEqual(m.audit_logs, 120);
}

function testAuditExtensions() {
  const ext = complianceDecisionService.buildAuditExtensions({
    complianceAction: 'anonymized',
    anonymizationApplied: true
  });
  assert.strictEqual(ext.anonymization_applied, true);
  assert.ok(ext.compliance_status);
  assert.ok(ext.regulation_tag);
}

const suite = [
  testClassificationAdvancedCategories,
  testPlanComplianceForceAnonymizePolicy,
  testPlanComplianceCriticalUnchanged,
  testRetentionPolicyDefaults,
  testMergePolicyRetention,
  testAuditExtensions
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
console.log('advancedComplianceScenarios: all passed');
