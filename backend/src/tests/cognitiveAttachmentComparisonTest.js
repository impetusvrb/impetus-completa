'use strict';

/**
 * Comparativo handleCognitiveRequest com e sem cognitiveAttachment.
 * Sem PostgreSQL, sem redes: mock de runCognitiveCouncil.
 *
 * Executar na pasta backend:
 *   node src/tests/cognitiveAttachmentComparisonTest.js
 */

const path = require('path');
const assert = require('assert');

/** Snapshot mínimo compatível com sanitize environmental + meta/metrics. */
function getMockEnvironmentalSnapshot() {
  return {
    contextual_data: {
      site: 'Fábrica Norte',
      line: 'Linha A'
    },
    kpis: [
      { id: 'k_h2o', label: 'Intensidade hídrica', value: 1.2, unit: 'm3/t' }
    ],
    events: [{ type: 'threshold', message: 'Meta de água excedida ~12%' }],
    assets: [{ id: 'pump-01', name: 'Bomba SP-Pump-01' }],
    meta: {
      unit: 'm3_per_ton',
      window: 'monthly',
      as_of: '2026-05-02T00:00:00.000Z'
    },
    metrics: {
      water_intensity: {
        value: 1.2,
        target: 1.0,
        deviation: 0.2,
        unit: 'm3_per_ton',
        window: 'monthly'
      }
    }
  };
}

function hasOperationalEnvelope(data) {
  const d = data && typeof data === 'object' ? data : {};
  const k = Array.isArray(d.kpis) ? d.kpis.length : 0;
  const ctxKeys =
    d.contextual_data && typeof d.contextual_data === 'object' && !Array.isArray(d.contextual_data)
      ? Object.keys(d.contextual_data).length
      : 0;
  const m =
    d.metrics && typeof d.metrics === 'object' && !Array.isArray(d.metrics)
      ? Object.keys(d.metrics).length
      : 0;
  return k > 0 || ctxKeys > 0 || m > 0;
}

function syntheticCouncilContent(params) {
  const data = params.data && typeof params.data === 'object' ? params.data : {};
  const enriched = hasOperationalEnvelope(data);
  if (!enriched) {
    return (
      'Análise genérica: sem dados operacionais injetados no dossiê. ' +
      'Recomendo confirmar KPIs, eventos e ativos no painel antes de conclusões sobre o sistema.'
    );
  }
  const line = data.contextual_data?.line || '—';
  const pump = Array.isArray(data.assets) && data.assets[0]?.name ? data.assets[0].name : '—';
  const kpi = Array.isArray(data.kpis) && data.kpis[0]?.label ? data.kpis[0].label : 'KPI ambiental';
  const w = data.metrics?.water_intensity;
  const win = w ? ` water_intensity=${w.value} (${w.unit}, janela ${w.window}).` : '';
  return (
    `Análise operacional (${line}, ${pump}): o indicador "${kpi}" requer atenção no período referenciado.${win} ` +
    'Eventos recentes sugerem revisão de meta hídrica e calibração de sensores associados.'
  );
}

function syntheticConfidence(params) {
  return hasOperationalEnvelope(params.data) ? 84 : 48;
}

function installMockCouncil() {
  const orchPath = require.resolve(path.join(__dirname, '../ai/cognitiveOrchestrator.js'));
  delete require.cache[orchPath];
  const orchestrator = require(orchPath);
  const original = orchestrator.runCognitiveCouncil;
  orchestrator.runCognitiveCouncil = async function mockRunCognitiveCouncil(params) {
    const content = syntheticCouncilContent(params);
    const confidence_score = syntheticConfidence(params);
    return {
      ok: true,
      trace_id: `mock-attach-compare-${hasOperationalEnvelope(params.data) ? 'with' : 'without'}`,
      processing_transparency: { mock: true },
      degraded: false,
      explanation_layer: null,
      result: {
        content,
        answer: content,
        confidence_score,
        requires_action: false
      }
    };
  };
  return { orchPath, orchestrator, original };
}

function loadControllerFresh(svcPath) {
  delete require.cache[svcPath];
  return require(svcPath);
}

async function main() {
  const svcPath = require.resolve(path.join(__dirname, '../services/cognitiveControllerService.js'));
  const { orchPath, orchestrator, original } = installMockCouncil();
  const { handleCognitiveRequest } = loadControllerFresh(svcPath);

  const user = { id: 'test-user-attach-compare', company_id: 'test-co-attach-compare' };
  const message = 'Analise o sistema';

  const snapshot = getMockEnvironmentalSnapshot();
  const cognitiveAttachment = {
    kind: 'environmental',
    version: 1,
    payload: snapshot
  };

  const withoutAttachment = await handleCognitiveRequest({
    user,
    message,
    options: { skipPromptFirewall: true, skipRecursiveUnified: true }
  });

  const withAttachment = await handleCognitiveRequest({
    user,
    message,
    cognitiveAttachment,
    options: { skipPromptFirewall: true, skipRecursiveUnified: true }
  });

  assert.strictEqual(withoutAttachment.ok, true, 'sem attachment deve OK (mock)');
  assert.strictEqual(withAttachment.ok, true, 'com attachment deve OK (mock)');

  console.log({
    without: {
      content: withoutAttachment.content,
      confidence: withoutAttachment.confidence_score
    },
    with: {
      content: withAttachment.content,
      confidence: withAttachment.confidence_score
    }
  });

  const wText = String(withoutAttachment.content || '');
  const xText = String(withAttachment.content || '');
  assert.ok(
    xText.includes('Linha A') || xText.includes('SP-Pump') || xText.includes('hídric'),
    'resposta com attachment deve citar contexto ambiental específico (mock)'
  );
  assert.ok(
    !wText.includes('Linha A') && !wText.includes('SP-Pump'),
    'resposta sem attachment não deve inventar linha/bomba do snapshot'
  );
  assert.ok(
    Number(withAttachment.confidence_score) > Number(withoutAttachment.confidence_score),
    'confidence com attachment deve ser maior (mock coerente com dados)'
  );

  console.info('cognitiveAttachmentComparisonTest: OK');

  orchestrator.runCognitiveCouncil = original;
  delete require.cache[orchPath];
  delete require.cache[svcPath];
}

main().catch((e) => {
  console.error('cognitiveAttachmentComparisonTest: FAIL', e);
  process.exitCode = 1;
});
