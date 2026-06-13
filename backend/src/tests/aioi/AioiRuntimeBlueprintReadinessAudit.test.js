'use strict';

const assert = require('assert');
const service = require('../../../src/services/aioi/aioiRuntimeBlueprintReadinessService');

const REQUIRED_CHECKS = ['RBR-01','RBR-02','RBR-03','RBR-04','RBR-05','RBR-06','RBR-07','RBR-08'];

describe('AioiRuntimeBlueprintReadinessAudit — P16.6', () => {
  let result;

  before(async () => {
    result = await service.validateRuntimeBlueprintReadiness();
  });

  it('deve retornar ok:true', () => {
    assert.strictEqual(result.ok, true);
  });
  it('runtime_blueprint_readiness deve ser true', () => {
    assert.strictEqual(result.runtime_blueprint_readiness, true);
  });
  it('deve ter 8 checks', () => {
    assert.strictEqual(result.total_checks, 8);
  });
  it('todos os 8 checks devem existir', () => {
    const ids = result.checks.map(c => c.id);
    REQUIRED_CHECKS.forEach(id => {
      assert.ok(ids.includes(id), `Check ausente: ${id}`);
    });
  });
  it('todos os checks devem passar', () => {
    result.checks.forEach(c => {
      assert.strictEqual(c.pass, true, `Check ${c.id} (${c.name}) falhou`);
    });
  });
  it('pass_count deve ser 8', () => {
    assert.strictEqual(result.pass_count, 8);
  });
  it('invariantes devem estar todos false', () => {
    const inv = result.invariants;
    assert.strictEqual(inv.runtime_enabled, false);
    assert.strictEqual(inv.runtime_active, false);
    assert.strictEqual(inv.runtime_authorized, false);
    assert.strictEqual(inv.cognitive_execution_allowed, false);
  });
  it('deve ter captured_at', () => {
    assert.ok(result.captured_at);
  });
});
