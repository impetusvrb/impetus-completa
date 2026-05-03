'use strict';

/**
 * Suite focada na overlay cognitiva (event-pipeline) — sem rede, sem BD, sem LLM real.
 * Executar: node src/tests/cognitiveAttachmentOverlayScenarios.js
 */

const assert = require('assert');
const path = require('path');

function clearCacheStartingWith(prefixAbs) {
  for (const k of Object.keys(require.cache)) {
    if (k.startsWith(prefixAbs)) delete require.cache[k];
  }
}

const PIPELINE_DIR = path.resolve(__dirname, '../eventPipeline');
const COGNITIVE_DIR = path.resolve(__dirname, '../cognitive');
clearCacheStartingWith(PIPELINE_DIR);
clearCacheStartingWith(COGNITIVE_DIR);

async function withFlag(value, fn) {
  const prev = process.env.IMPETUS_EVENT_PIPELINE_ENABLED;
  process.env.IMPETUS_EVENT_PIPELINE_ENABLED = value;
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.IMPETUS_EVENT_PIPELINE_ENABLED;
    else process.env.IMPETUS_EVENT_PIPELINE_ENABLED = prev;
  }
}

async function testNoOpWhenFlagOff() {
  await withFlag('false', async () => {
    const cognitiveAttachment = require('../cognitive/cognitiveAttachment');
    const r = await cognitiveAttachment({ text: 'olá' }, { traceId: 't', userId: 'u' });
    assert.strictEqual(r, null, 'flag desligada deve devolver null');
  });
  console.log('  ✓ overlay devolve null com IMPETUS_EVENT_PIPELINE_ENABLED!=true');
}

async function testProcessEventShape() {
  await withFlag('true', async () => {
    clearCacheStartingWith(PIPELINE_DIR);
    clearCacheStartingWith(COGNITIVE_DIR);
    const processEvent = require('../eventPipeline/processEvent');
    const r = await processEvent('Crie tarefa para máquina XPTO-12 (CPF 123.456.789-09)', {
      traceId: 'fixed-trace',
      userId: 'u1'
    });
    assert.strictEqual(r.traceId, 'fixed-trace', 'usa traceId fornecido');
    assert.ok(typeof r.intent === 'string' && r.intent.length > 0);
    assert.ok(typeof r.summary === 'string');
    assert.ok(r.summary.includes('[cpf]'), 'CPF foi anonimizado no summary');
    assert.ok(Array.isArray(r.entities));
    assert.ok(typeof r.confidence === 'number' && r.confidence >= 0 && r.confidence <= 1);
    assert.strictEqual(r.metadata.source, 'event_pipeline');
    assert.ok(typeof r.metadata.timestamp === 'number');
  });
  console.log('  ✓ processEvent devolve forma padronizada');
}

async function testOverlayAttachmentShape() {
  await withFlag('true', async () => {
    clearCacheStartingWith(PIPELINE_DIR);
    clearCacheStartingWith(COGNITIVE_DIR);
    const cognitiveAttachment = require('../cognitive/cognitiveAttachment');
    const r = await cognitiveAttachment({ text: 'Bom dia' }, { traceId: 'trace-1', userId: 'u1' });
    assert.ok(r && typeof r === 'object', 'devolve objecto');
    assert.ok(r.cognitive, 'tem chave cognitive');
    assert.strictEqual(r.cognitive.traceId, 'trace-1');
    assert.ok(typeof r.cognitive.intent === 'string');
    assert.strictEqual(r.cognitive.metadata.source, 'event_pipeline');
  });
  console.log('  ✓ cognitiveAttachment devolve { cognitive: snapshot }');
}

async function testPromptBlock() {
  const { formatCognitiveBlock } = require('../cognitive/promptBlock');
  assert.strictEqual(formatCognitiveBlock(null), '');
  assert.strictEqual(formatCognitiveBlock(undefined), '');
  const block = formatCognitiveBlock({
    intent: 'analysis',
    summary: 'Pedido de relatório de KPIs.',
    entities: ['XPTO-12', 'BOMBA-01'],
    confidence: 0.82
  });
  assert.ok(block.startsWith('[Possible semantic interpretation — event pipeline overlay]'));
  assert.ok(block.includes('- Possible intent: analysis (confidence: 0.82)'));
  assert.ok(block.includes('- Context summary: Pedido de relatório de KPIs.'));
  assert.ok(block.includes('- Extracted entities: XPTO-12, BOMBA-01'));
  assert.ok(block.includes('Use this as a supporting signal, not a source of truth.'));

  const blockNoEntities = formatCognitiveBlock({
    intent: 'conversation',
    summary: 'Olá',
    entities: [],
    confidence: 0.6
  });
  assert.ok(blockNoEntities.includes('- Extracted entities: none detected'));

  const blockNoConfidence = formatCognitiveBlock({
    intent: 'task',
    summary: 'Criar OS',
    entities: ['XPTO-12']
  });
  assert.ok(blockNoConfidence.includes('(confidence: unknown)'));

  const blockNoSummary = formatCognitiveBlock({ intent: 'task', entities: ['X'] });
  assert.ok(blockNoSummary.includes('- Context summary: unavailable'));

  console.log('  ✓ promptBlock formata bloco soft (event pipeline overlay) corretamente');
}

async function testOverlayHandlesPipelineFailure() {
  await withFlag('true', async () => {
    clearCacheStartingWith(PIPELINE_DIR);
    clearCacheStartingWith(COGNITIVE_DIR);
    const procPath = require.resolve('../eventPipeline/processEvent');
    require.cache[procPath] = {
      id: procPath,
      filename: procPath,
      loaded: true,
      exports: async () => {
        throw new Error('boom');
      }
    };
    const cognitiveAttachment = require('../cognitive/cognitiveAttachment');
    const r = await cognitiveAttachment({ text: 'Bom dia' }, { traceId: 'trace-x' });
    assert.strictEqual(r, null, 'falha no pipeline → null sem propagar excepção');
    delete require.cache[procPath];
    clearCacheStartingWith(PIPELINE_DIR);
    clearCacheStartingWith(COGNITIVE_DIR);
  });
  console.log('  ✓ overlay engole excepção do pipeline e devolve null');
}

(async () => {
  console.log('cognitiveAttachmentOverlayScenarios:');
  try {
    await testPromptBlock();
    await testNoOpWhenFlagOff();
    await testProcessEventShape();
    await testOverlayAttachmentShape();
    await testOverlayHandlesPipelineFailure();
    console.log('cognitiveAttachmentOverlayScenarios: OK');
  } catch (e) {
    console.error('cognitiveAttachmentOverlayScenarios: FAIL', e);
    process.exitCode = 1;
  }
})();
