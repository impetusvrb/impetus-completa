'use strict';

const assert = require('assert');
const service = require('../../../src/services/aioi/aioiRuntimeBlueprintCatalogService');

const EXPECTED_CATEGORIES = [
  'governance', 'compliance', 'assurance', 'knowledge', 'observation',
  'recommendation', 'human_review', 'authorization', 'simulation', 'runtime'
];

describe('AioiRuntimeBlueprintCatalogAudit — P16.2', () => {
  let catalog;

  before(async () => {
    catalog = await service.getRuntimeBlueprintCatalog();
  });

  it('deve retornar ok:true', () => {
    assert.strictEqual(catalog.ok, true);
  });
  it('deve ter todas as 10 categorias', () => {
    EXPECTED_CATEGORIES.forEach(cat => {
      assert.ok(catalog.categories.includes(cat), `Categoria ausente: ${cat}`);
    });
    assert.strictEqual(catalog.categories.length, EXPECTED_CATEGORIES.length);
  });
  it('catalog deve ter chave para cada categoria', () => {
    EXPECTED_CATEGORIES.forEach(cat => {
      assert.ok(cat in catalog.catalog, `catalog sem chave: ${cat}`);
    });
  });
  it('blueprint_status deve ser DEFINED_NOT_DEPLOYABLE', () => {
    assert.strictEqual(catalog.blueprint_status, 'DEFINED_NOT_DEPLOYABLE');
  });
  it('deployable deve ser false', () => {
    assert.strictEqual(catalog.deployable, false);
  });
  it('all_gates_closed deve ser true', () => {
    assert.strictEqual(catalog.all_gates_closed, true);
  });
  it('getBlueprintsByCategory deve funcionar para category válida', async () => {
    const r = await service.getBlueprintsByCategory('runtime');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.category, 'runtime');
    assert.ok(Array.isArray(r.components));
  });
  it('getBlueprintsByCategory deve retornar vazio para category inválida', async () => {
    const r = await service.getBlueprintsByCategory('invalida');
    assert.strictEqual(r.count, 0);
  });
  it('deve ter captured_at', () => {
    assert.ok(catalog.captured_at);
  });
});
