'use strict';

const assert = require('assert');
const service = require('../../../src/services/aioi/aioiRuntimeBlueprintEvidenceService');

describe('AioiRuntimeBlueprintEvidenceAudit — P16.3', () => {
  let result;

  before(async () => {
    result = await service.getRuntimeBlueprintEvidenceChains();
  });

  it('deve retornar ok:true', () => {
    assert.strictEqual(result.ok, true);
  });
  it('deve ter chains não-vazio', () => {
    assert.ok(Array.isArray(result.chains) && result.chains.length > 0);
  });
  it('total_blueprints deve ser ≥ 1', () => {
    assert.ok(result.total_blueprints >= 1);
  });
  it('all_have_evidence deve ser true', () => {
    assert.strictEqual(result.all_have_evidence, true, 'Blueprints sem evidência detectados');
  });
  it('traceable_count deve igualar total_blueprints', () => {
    assert.strictEqual(result.traceable_count, result.total_blueprints);
  });
  it('chain deve ter blueprint_id e evidence_chain', () => {
    result.chains.forEach(chain => {
      assert.ok(chain.blueprint_id, 'blueprint_id obrigatório na cadeia');
      assert.ok(Array.isArray(chain.evidence_chain) && chain.evidence_chain.length > 0);
    });
  });
  it('traceability_status deve ser TRACEABLE', () => {
    result.chains.forEach(chain => {
      assert.strictEqual(chain.traceability_status, 'TRACEABLE');
    });
  });
  it('source_validations deve ser array não-vazio', () => {
    result.chains.forEach(chain => {
      assert.ok(Array.isArray(chain.source_validations) && chain.source_validations.length > 0);
    });
  });
  it('deve ter captured_at', () => {
    assert.ok(result.captured_at);
  });
});
