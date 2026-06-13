'use strict';

const assert = require('assert');
const service = require('../../../src/services/aioi/aioiRuntimeBlueprintBoundaryService');

const REQUIRED_CHECKS = ['RBB-01','RBB-02','RBB-03','RBB-04','RBB-05','RBB-06','RBB-07','RBB-08'];

describe('AioiRuntimeBlueprintBoundaryAudit — P16.4', () => {
  let result;

  before(async () => {
    result = await service.validateRuntimeBlueprintBoundaries();
  });

  it('deve retornar ok:true', () => {
    assert.strictEqual(result.ok, true);
  });
  it('boundaries_valid deve ser true', () => {
    assert.strictEqual(result.boundaries_valid, true);
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
  it('deve ter captured_at', () => {
    assert.ok(result.captured_at);
  });
});
