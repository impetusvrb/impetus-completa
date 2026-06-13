'use strict';

const assert = require('assert');
const service = require('../../../src/services/aioi/aioiCognitiveRuntimeBlueprintService');

describe('AioiCognitiveRuntimeBlueprintAudit — P16.1', () => {
  let result;

  before(async () => {
    result = await service.generateRuntimeBlueprint();
  });

  it('deve retornar ok:true', () => {
    assert.strictEqual(result.ok, true);
  });
  it('deve ter blueprint_id', () => {
    assert.ok(result.blueprint_id, 'blueprint_id obrigatório');
  });
  it('blueprint_status deve ser DEFINED_NOT_DEPLOYABLE', () => {
    assert.strictEqual(result.blueprint_status, 'DEFINED_NOT_DEPLOYABLE');
  });
  it('deployable deve ser false', () => {
    assert.strictEqual(result.deployable, false);
  });
  it('deve ter runtime_components não-vazio', () => {
    assert.ok(Array.isArray(result.runtime_components) && result.runtime_components.length > 0);
  });
  it('todos os componentes devem ter status NOT_DEPLOYABLE', () => {
    result.runtime_components.forEach(c => {
      assert.strictEqual(c.status, 'NOT_DEPLOYABLE');
    });
  });
  it('todos os componentes devem exigir aprovação humana', () => {
    result.runtime_components.forEach(c => {
      assert.strictEqual(c.requires_human, true);
      assert.strictEqual(c.requires_approval, true);
    });
  });
  it('todos os gates devem estar fechados', () => {
    assert.strictEqual(result.all_gates_closed, true);
    result.runtime_gates.forEach(g => {
      assert.strictEqual(g.open, false);
    });
  });
  it('todos os controles devem estar não-satisfeitos', () => {
    assert.strictEqual(result.all_controls_unsatisfied, true);
    result.runtime_controls.forEach(c => {
      assert.strictEqual(c.satisfied, false);
    });
  });
  it('invariantes devem estar todos false', () => {
    const inv = result.invariants;
    assert.strictEqual(inv.runtime_enabled, false);
    assert.strictEqual(inv.runtime_active, false);
    assert.strictEqual(inv.runtime_authorized, false);
    assert.strictEqual(inv.cognitive_execution_allowed, false);
  });
  it('runtime_constraints devem estar desativados', () => {
    const c = result.runtime_constraints;
    assert.strictEqual(c.runtime_enabled, false);
    assert.strictEqual(c.runtime_active, false);
    assert.strictEqual(c.runtime_authorized, false);
    assert.strictEqual(c.cognitive_execution_allowed, false);
    assert.strictEqual(c.state_mutation_allowed, false);
  });
  it('deve ter generated_at', () => {
    assert.ok(result.generated_at);
  });
});
