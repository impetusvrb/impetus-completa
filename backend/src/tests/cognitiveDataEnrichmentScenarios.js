'use strict';

/**
 * Enriquecimento de dados antes do Conselho Cognitivo — cenários funcionais.
 * Executar: node src/tests/cognitiveDataEnrichmentScenarios.js
 */

const assert = require('assert');
const { detectIntent } = require('../services/intentDetectionService');
const { retrieveContextualData } = require('../services/dataRetrievalService');

const QUESTION = 'Qual o cargo do Wellington?';

const mockUserOk = {
  id: '00000000-0000-0000-0000-000000000001',
  company_id: '00000000-0000-0000-0000-000000000002',
  role: 'colaborador'
};

async function simulateOrchestratorEnrichment(requestText, data, user) {
  const intentData = detectIntent(requestText);
  let enrichedData = data;
  if (intentData.intent !== 'generic') {
    const retrieved = await retrieveContextualData({
      user,
      intent: intentData.intent,
      entities: intentData.entities
    });
    enrichedData = { ...data, ...retrieved };
  }
  return { intentData, enrichedData };
}

async function testIntentDetectsCargoWellington() {
  const r = detectIntent(QUESTION);
  assert.strictEqual(r.intent, 'get_user_role');
  assert.ok(
    r.entities.person_name && /wellington/i.test(r.entities.person_name),
    'person_name deve referir Wellington'
  );
}

async function testGetUserRoleWithoutPersonNameReturnsEmpty() {
  const retrieved = await retrieveContextualData({
    user: mockUserOk,
    intent: 'get_user_role',
    entities: {}
  });
  assert.deepStrictEqual(retrieved.contextual_data, {});
}

async function testGetUserRoleWithPersonUsesDbShape() {
  const intentData = detectIntent(QUESTION);
  const retrieved = await retrieveContextualData({
    user: mockUserOk,
    intent: intentData.intent,
    entities: intentData.entities
  });
  assert.ok(Array.isArray(retrieved.kpis));
  const cd = retrieved.contextual_data;
  if (cd && Object.keys(cd).length > 0) {
    assert.ok(Object.prototype.hasOwnProperty.call(cd, 'user_role'));
    assert.ok(Object.prototype.hasOwnProperty.call(cd, 'user_name'));
  }
}

async function testGovernanceNoCompanyReturnsEmpty() {
  const intentData = detectIntent(QUESTION);
  const retrieved = await retrieveContextualData({
    user: { id: 'x', role: 'ceo' },
    intent: intentData.intent,
    entities: intentData.entities
  });
  assert.deepStrictEqual(retrieved.contextual_data, {});
  assert.strictEqual(retrieved.kpis.length, 0);
}

async function testGovernanceSensitiveIntentBlocked() {
  const retrieved = await retrieveContextualData({
    user: mockUserOk,
    intent: 'get_sensitive_data',
    entities: {}
  });
  assert.deepStrictEqual(retrieved.contextual_data, {});
}

async function testSimulatedMergeDoesNotThrow() {
  const { intentData, enrichedData } = await simulateOrchestratorEnrichment(QUESTION, {}, mockUserOk);
  assert.strictEqual(intentData.intent, 'get_user_role');
  assert.ok(enrichedData && typeof enrichedData === 'object');
  assert.ok(Array.isArray(enrichedData.kpis));
}

const suite = [
  testIntentDetectsCargoWellington,
  testGetUserRoleWithoutPersonNameReturnsEmpty,
  testGetUserRoleWithPersonUsesDbShape,
  testGovernanceNoCompanyReturnsEmpty,
  testGovernanceSensitiveIntentBlocked,
  testSimulatedMergeDoesNotThrow
];

(async () => {
  let failed = false;
  for (const t of suite) {
    try {
      await Promise.resolve(t());
      console.log('OK', t.name);
    } catch (e) {
      failed = true;
      console.error('FAIL', t.name, e);
    }
  }
  if (failed) process.exit(1);
  console.log('cognitiveDataEnrichmentScenarios: all passed');
})();
