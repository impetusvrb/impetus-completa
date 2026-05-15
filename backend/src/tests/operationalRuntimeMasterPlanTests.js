'use strict';

/**
 * Testes abrangentes — Plano Mestre Final: Consolidação do Impetus como IA Operacional Viva
 * 12 Fases: Memory Binding, Ingestion, Task Orchestration, Tool Calling, Document,
 *           Assistance, Executive, Density, Explainability, Learning, Observability, Pipeline
 */

let passed = 0;
let failed = 0;
const errors = [];

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    errors.push(label);
    console.log(`  ❌ ${label}`);
  }
}

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PLANO MESTRE FINAL — TESTES DE VALIDAÇÃO (12 FASES)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ═══════════════════════════════════════════════
  // FASE 1 — MEMORY BINDING CONSOLIDATION
  // ═══════════════════════════════════════════════
  console.log('── FASE 1: Memory Binding Consolidation ──');
  try {
    const memBinding = require('../services/operational/operationalMemoryBindingService');
    assert('F1.1: módulo carregado', !!memBinding);
    assert('F1.2: isEnabled é função', typeof memBinding.isEnabled === 'function');
    assert('F1.3: buildOperationalContext é função', typeof memBinding.buildOperationalContext === 'function');

    const r1 = await memBinding.buildOperationalContext({});
    assert('F1.4: retorno sem companyId = null block', r1.block === null);

    const r2 = await memBinding.buildOperationalContext({ companyId: '00000000-0000-0000-0000-000000000001' });
    assert('F1.5: retorno com companyId fictício = meta definido', !!r2.meta);
    assert('F1.6: durationMs calculado', r2.meta.durationMs !== undefined || r2.meta.empty || r2.meta.skipped);
  } catch (err) {
    assert('F1.X: falha inesperada - ' + err.message, false);
  }

  // ═══════════════════════════════════════════════
  // FASE 2 — INGESTÃO COGNITIVA UNIFICADA
  // ═══════════════════════════════════════════════
  console.log('\n── FASE 2: Ingestão Cognitiva Unificada ──');
  try {
    const ingestion = require('../services/operational/unifiedOperationalIngestionService');
    assert('F2.1: módulo carregado', !!ingestion);
    assert('F2.2: isEnabled é função', typeof ingestion.isEnabled === 'function');
    assert('F2.3: SOURCE_TYPES definidos', Object.keys(ingestion.SOURCE_TYPES).length >= 8);

    const entities1 = ingestion._extractEntities('preciso disso até amanhã urgente');
    assert('F2.4: detecta task', !!entities1.task);
    assert('F2.5: detecta deadline', !!entities1.deadline);
    assert('F2.6: detecta urgente', !!entities1.urgent);

    const entities2 = ingestion._extractEntities('me lembre de verificar o relatório');
    assert('F2.7: detecta reminder', !!entities2.reminder);

    const entities3 = ingestion._extractEntities('favor enviar para Diretor Carlos');
    assert('F2.8: detecta assignee', !!entities3.assignee);

    const entities4 = ingestion._extractEntities('risco de contaminação na linha 3');
    assert('F2.9: detecta risk', !!entities4.risk);

    const entities5 = ingestion._extractEntities('prepare relatório de manutenção');
    assert('F2.10: detecta report', !!entities5.report);

    const d1 = ingestion._parseDeadline('amanhã');
    assert('F2.11: parseDeadline amanhã', !!d1 && new Date(d1) > new Date());

    const d2 = ingestion._parseDeadline('hoje');
    assert('F2.12: parseDeadline hoje', !!d2);

    const d3 = ingestion._parseDeadline('segunda');
    assert('F2.13: parseDeadline dia da semana', !!d3);

    const d4 = ingestion._parseDeadline('14h');
    assert('F2.14: parseDeadline hora', !!d4);

    const p1 = ingestion._classifyPriority({ urgent: { detected: true } });
    assert('F2.15: prioridade urgent = critica', p1 === 'critica');

    const p2 = ingestion._classifyPriority({ deadline: { detected: true } });
    assert('F2.16: prioridade deadline = alta', p2 === 'alta');

    const p3 = ingestion._classifyPriority({ task: { detected: true } });
    assert('F2.17: prioridade task = normal', p3 === 'normal');

    const p4 = ingestion._classifyPriority({});
    assert('F2.18: prioridade vazia = baixa', p4 === 'baixa');

    ingestion.ingest({});
    assert('F2.19: ingest com params vazios não quebra', true);

    ingestion.ingest({ content: 'teste curto', companyId: 'test-co', sourceType: 'chat_impetus' });
    assert('F2.20: ingest com params válidos não quebra', true);
  } catch (err) {
    assert('F2.X: falha inesperada - ' + err.message, false);
  }

  // ═══════════════════════════════════════════════
  // FASE 3 — TASK & REMINDER ORCHESTRATION
  // ═══════════════════════════════════════════════
  console.log('\n── FASE 3: Task & Reminder Orchestration ──');
  try {
    const orchestrator = require('../services/operational/cognitiveTaskOrchestrator');
    assert('F3.1: módulo carregado', !!orchestrator);
    assert('F3.2: isEnabled é função', typeof orchestrator.isEnabled === 'function');
    assert('F3.3: createTaskFromConversation é função', typeof orchestrator.createTaskFromConversation === 'function');
    assert('F3.4: scheduleReminder é função', typeof orchestrator.scheduleReminder === 'function');
    assert('F3.5: checkEscalation é função', typeof orchestrator.checkEscalation === 'function');
    assert('F3.6: closeTask é função', typeof orchestrator.closeTask === 'function');

    const r1 = await orchestrator.createTaskFromConversation({});
    assert('F3.7: createTask sem companyId = falha controlada', r1.ok === false);

    const r2 = await orchestrator.scheduleReminder({});
    assert('F3.8: scheduleReminder sem companyId = falha controlada', r2.ok === false);

    const r3 = await orchestrator.checkEscalation('fake-company');
    assert('F3.9: checkEscalation com company fictícia = array vazio', Array.isArray(r3));
  } catch (err) {
    assert('F3.X: falha inesperada - ' + err.message, false);
  }

  // ═══════════════════════════════════════════════
  // FASE 4 — TOOL CALLING GOVERNADO
  // ═══════════════════════════════════════════════
  console.log('\n── FASE 4: Tool Calling Governado ──');
  try {
    const tools = require('../services/operational/operationalToolRegistry');
    assert('F4.1: módulo carregado', !!tools);
    assert('F4.2: isEnabled é função', typeof tools.isEnabled === 'function');
    assert('F4.3: isShadowMode é função', typeof tools.isShadowMode === 'function');
    assert('F4.4: TOOL_DEFINITIONS são array', Array.isArray(tools.TOOL_DEFINITIONS));
    assert('F4.5: pelo menos 5 tools definidas', tools.TOOL_DEFINITIONS.length >= 5);

    const defs = tools.getToolDefinitions();
    assert('F4.6: getToolDefinitions respeita flag', Array.isArray(defs));

    const r1 = await tools.executeTool('unknown_tool', {}, { companyId: 'test' });
    assert('F4.7: tool desconhecida = falha controlada', r1.ok === false);

    const r2 = await tools.executeTool('consultar_tarefas', {}, {});
    assert('F4.8: sem companyId = falha controlada', r2.ok === false);

    for (const td of tools.TOOL_DEFINITIONS) {
      assert(`F4.T: tool "${td.function.name}" tem name/description/parameters`,
        !!td.function.name && !!td.function.description && !!td.function.parameters);
    }

    const audit = tools.getAuditLog();
    assert('F4.9: auditLog é array', Array.isArray(audit));
  } catch (err) {
    assert('F4.X: falha inesperada - ' + err.message, false);
  }

  // ═══════════════════════════════════════════════
  // FASE 5 — DOCUMENT INTELLIGENCE RUNTIME
  // ═══════════════════════════════════════════════
  console.log('\n── FASE 5: Document Intelligence Runtime ──');
  try {
    const docRuntime = require('../services/operational/documentOperationalRuntime');
    assert('F5.1: módulo carregado', !!docRuntime);
    assert('F5.2: isEnabled é função', typeof docRuntime.isEnabled === 'function');
    assert('F5.3: extractText é função', typeof docRuntime.extractText === 'function');
    assert('F5.4: summarizeDocument é função', typeof docRuntime.summarizeDocument === 'function');
    assert('F5.5: compareDocuments é função', typeof docRuntime.compareDocuments === 'function');

    const r1 = await docRuntime.extractText(null);
    assert('F5.6: extractText null = falha controlada', r1.ok === false);

    const r2 = await docRuntime.extractText('/nonexistent/file.pdf');
    assert('F5.7: extractText inexistente = file_not_found', r2.reason === 'file_not_found');
  } catch (err) {
    assert('F5.X: falha inesperada - ' + err.message, false);
  }

  // ═══════════════════════════════════════════════
  // FASE 6 — OPERATIONAL ASSISTANCE RUNTIME
  // ═══════════════════════════════════════════════
  console.log('\n── FASE 6: Operational Assistance Runtime ──');
  try {
    const assistance = require('../services/operational/operationalAssistanceRuntime');
    assert('F6.1: módulo carregado', !!assistance);
    assert('F6.2: isEnabled é função', typeof assistance.isEnabled === 'function');
    assert('F6.3: ETHICAL_BLOCK definido', typeof assistance.ETHICAL_BLOCK === 'string' && assistance.ETHICAL_BLOCK.length > 50);
    assert('F6.4: FORBIDDEN_ANALYSIS definidas', Array.isArray(assistance.FORBIDDEN_ANALYSIS) && assistance.FORBIDDEN_ANALYSIS.length >= 3);
    assert('F6.5: analyzeOperationalData é função', typeof assistance.analyzeOperationalData === 'function');
    assert('F6.6: detectDeviations é função', typeof assistance.detectDeviations === 'function');
    assert('F6.7: prepareBriefing é função', typeof assistance.prepareBriefing === 'function');

    const r1 = await assistance.analyzeOperationalData({});
    assert('F6.8: analyzeOperationalData sem params = missing_params', r1.reason === 'missing_params');

    const r2 = await assistance.detectDeviations('fake-company');
    assert('F6.9: detectDeviations = ok com array', r2.ok === true && Array.isArray(r2.deviations));

    assert('F6.10: ETHICAL_BLOCK proíbe culpa individual', assistance.ETHICAL_BLOCK.includes('NUNCA imputar culpa individual'));
    assert('F6.11: ETHICAL_BLOCK proíbe ranking', assistance.ETHICAL_BLOCK.includes('NUNCA gerar ranking'));
    assert('F6.12: ETHICAL_BLOCK proíbe julgamento', assistance.ETHICAL_BLOCK.includes('NUNCA fazer julgamento'));
  } catch (err) {
    assert('F6.X: falha inesperada - ' + err.message, false);
  }

  // ═══════════════════════════════════════════════
  // FASE 7 — EXECUTIVE EXPERIENCE REFINEMENT
  // ═══════════════════════════════════════════════
  console.log('\n── FASE 7: Executive Experience Refinement ──');
  try {
    const exec = require('../services/operational/executiveExperienceService');
    assert('F7.1: módulo carregado', !!exec);
    assert('F7.2: isEnabled é função', typeof exec.isEnabled === 'function');
    assert('F7.3: buildExecutiveNarrative é função', typeof exec.buildExecutiveNarrative === 'function');
    assert('F7.4: prioritizeWidgets é função', typeof exec.prioritizeWidgets === 'function');
    assert('F7.5: checkCognitiveSaturation é função', typeof exec.checkCognitiveSaturation === 'function');

    const n1 = exec.buildExecutiveNarrative({});
    assert('F7.6: narrativa vazia = estável', n1 && n1.narrative.includes('estável'));

    const n2 = exec.buildExecutiveNarrative({
      alerts: [{ severity: 'critica' }],
      tasks: [{ scheduled_at: new Date(Date.now() - 86400000).toISOString() }]
    });
    assert('F7.7: narrativa com alerta crítico', n2.narrative.includes('alerta'));
    assert('F7.8: prioridade alta', n2.priority === 'high');

    const w = exec.prioritizeWidgets([
      { id: 1, baseScore: 50, hasCriticalData: true },
      { id: 2, baseScore: 10 },
      { id: 3, baseScore: 90 }
    ]);
    assert('F7.9: widgets priorizados', w[0]._score >= w[1]._score);

    const sat1 = exec.checkCognitiveSaturation(15, 0);
    assert('F7.10: saturação alta', sat1.saturated === true);

    const sat2 = exec.checkCognitiveSaturation(2, 1);
    assert('F7.11: sem saturação', sat2.saturated === false);
  } catch (err) {
    assert('F7.X: falha inesperada - ' + err.message, false);
  }

  // ═══════════════════════════════════════════════
  // FASE 8 — DENSIDADE OPERACIONAL REAL
  // ═══════════════════════════════════════════════
  console.log('\n── FASE 8: Densidade Operacional Real ──');
  try {
    const adapters = require('../services/operational/operationalDensityAdapters');
    assert('F8.1: módulo carregado', !!adapters);
    assert('F8.2: isEnabled é função', typeof adapters.isEnabled === 'function');
    assert('F8.3: ALL_ADAPTERS definidos', adapters.ALL_ADAPTERS.length === 4);

    const statuses = adapters.getAdapterStatuses();
    assert('F8.4: statuses retornados', statuses.length === 4);

    for (const adapter of adapters.ALL_ADAPTERS) {
      const r = await adapter.ingest({ test: true });
      assert(`F8.A: adapter "${adapter.name}" ingest não quebra`, r && typeof r === 'object');
    }

    const plcResult = await adapters.plcAdapter.ingest({ signals: [1, 2], alarms: ['test'] });
    assert('F8.5: PLC normaliza signals', plcResult.data && Array.isArray(plcResult.data.signals));

    const erpResult = await adapters.erpAdapter.ingest({ orders: [{ id: 1 }] });
    assert('F8.6: ERP normaliza orders', erpResult.data && Array.isArray(erpResult.data.orders));
  } catch (err) {
    assert('F8.X: falha inesperada - ' + err.message, false);
  }

  // ═══════════════════════════════════════════════
  // FASE 9 — EXPLAINABILITY TOTAL
  // ═══════════════════════════════════════════════
  console.log('\n── FASE 9: Explainability Total ──');
  try {
    const explain = require('../services/operational/explainabilityService');
    assert('F9.1: módulo carregado', !!explain);
    assert('F9.2: isEnabled é função', typeof explain.isEnabled === 'function');
    assert('F9.3: recordDecision é função', typeof explain.recordDecision === 'function');
    assert('F9.4: getExplanation é função', typeof explain.getExplanation === 'function');
    assert('F9.5: humanReadableExplanation é função', typeof explain.humanReadableExplanation === 'function');

    const r1 = await explain.recordDecision({
      companyId: 'test', userId: 'u1',
      decisionType: 'test_decision', entityId: 'e1', entityType: 'test',
      reasons: ['motivo 1', 'motivo 2'], policies: ['policy_a'],
      scores: { confidence: 0.85 }, model: 'gpt-4'
    });
    assert('F9.6: recordDecision ok', r1.ok === true);

    const readable = explain.humanReadableExplanation({
      reasons: ['tarefa atrasada', 'deadline vencido'],
      policies_applied: ['escalation_policy'],
      scores: { urgency: 0.9 },
      model_used: 'gpt-4'
    });
    assert('F9.7: humanReadable contém motivos', readable.includes('tarefa atrasada'));
    assert('F9.8: humanReadable contém scores', readable.includes('urgency'));

    const r2 = explain.humanReadableExplanation(null);
    assert('F9.9: humanReadable null = mensagem padrão', typeof r2 === 'string');
  } catch (err) {
    assert('F9.X: falha inesperada - ' + err.message, false);
  }

  // ═══════════════════════════════════════════════
  // FASE 10 — CONTINUOUS OPERATIONAL LEARNING
  // ═══════════════════════════════════════════════
  console.log('\n── FASE 10: Continuous Operational Learning ──');
  try {
    const learning = require('../services/operational/continuousLearningService');
    assert('F10.1: módulo carregado', !!learning);
    assert('F10.2: isEnabled é função', typeof learning.isEnabled === 'function');
    assert('F10.3: FEEDBACK_TYPES definidos', learning.FEEDBACK_TYPES.length >= 6);

    const r1 = learning.recordFeedback({ companyId: 'test', feedbackType: 'task_quality', rating: 4 });
    assert('F10.4: recordFeedback ok', r1.ok === true);

    const r2 = learning.recordFeedback({ companyId: 'test', feedbackType: 'invalid_type' });
    assert('F10.5: feedbackType inválido rejeitado', r2.ok === false);

    const r3 = learning.recordFeedback({});
    assert('F10.6: feedback vazio rejeitado', r3.ok === false);

    learning.recordFeedback({ companyId: 'test-learn', feedbackType: 'ignored_reminder', rating: 1 });
    learning.recordFeedback({ companyId: 'test-learn', feedbackType: 'ignored_reminder', rating: 1 });
    learning.recordFeedback({ companyId: 'test-learn', feedbackType: 'ignored_reminder', rating: 2 });

    const patterns = learning.getLearnedPatterns('test-learn');
    assert('F10.7: patterns detectados', patterns.length > 0);

    const insights = learning.getLearningInsights('test-learn');
    assert('F10.8: insights gerados', insights.totalFeedbackRecorded > 0);
    assert('F10.9: recomendações geradas', insights.recommendations.length > 0);

    const r4 = learning.recordFeedback({ companyId: 'test', feedbackType: 'false_positive', rating: 5 });
    assert('F10.10: false_positive com rating alto aceito', r4.ok === true);
  } catch (err) {
    assert('F10.X: falha inesperada - ' + err.message, false);
  }

  // ═══════════════════════════════════════════════
  // FASE 11 — ENTERPRISE OBSERVABILITY
  // ═══════════════════════════════════════════════
  console.log('\n── FASE 11: Enterprise Observability ──');
  try {
    const obs = require('../services/operational/enterpriseObservabilityRuntime');
    assert('F11.1: módulo carregado', !!obs);
    assert('F11.2: isEnabled é função', typeof obs.isEnabled === 'function');

    const t1 = obs.startTrace('test_operation', { test: true });
    assert('F11.3: startTrace retorna traceId', !!t1.traceId);

    const sp1 = obs.addSpan(t1.traceId, 'child_span', { detail: 'x' });
    assert('F11.4: addSpan retorna spanId', !!sp1);

    obs.endSpan(t1.traceId, sp1, 'ok');
    obs.endTrace(t1.traceId, 'ok');

    const traces = obs.getRecentTraces(10);
    assert('F11.5: trace aparece em recentes', traces.length > 0);
    assert('F11.6: trace tem status ok', traces[traces.length - 1].status === 'ok');

    obs.recordMetric('test_metric', 42, { env: 'test' });
    obs.recordMetric('test_metric', 58, { env: 'test' });
    const metrics = obs.getMetrics({ name: 'test_metric' });
    assert('F11.7: métrica registrada', metrics.length > 0);
    assert('F11.8: métrica tem avg correto', metrics[0].avg === 50);
    assert('F11.9: métrica tem count correto', metrics[0].count === 2);

    const exported = obs.exportAuditData({ hours: 1 });
    assert('F11.10: export funciona', exported.ok === true);
    assert('F11.11: export tem traces', exported.traceCount > 0);
  } catch (err) {
    assert('F11.X: falha inesperada - ' + err.message, false);
  }

  // ═══════════════════════════════════════════════
  // FASE 12 — CONSOLIDAÇÃO FINAL (PIPELINE UNIFICADO)
  // ═══════════════════════════════════════════════
  console.log('\n── FASE 12: Consolidação Final (Pipeline Unificado) ──');
  try {
    const pipeline = require('../services/operational/unifiedOperationalPipeline');
    assert('F12.1: módulo carregado', !!pipeline);
    assert('F12.2: isEnabled é função', typeof pipeline.isEnabled === 'function');
    assert('F12.3: PIPELINE_STAGES definidos', pipeline.PIPELINE_STAGES.length === 10);

    const stages = pipeline.PIPELINE_STAGES;
    assert('F12.4: stage communication existe', stages.includes('communication'));
    assert('F12.5: stage ingestion existe', stages.includes('ingestion'));
    assert('F12.6: stage cognition existe', stages.includes('cognition'));
    assert('F12.7: stage governance existe', stages.includes('governance'));
    assert('F12.8: stage orchestration existe', stages.includes('orchestration'));
    assert('F12.9: stage assistance existe', stages.includes('assistance'));
    assert('F12.10: stage reminder existe', stages.includes('reminder'));
    assert('F12.11: stage execution existe', stages.includes('execution'));
    assert('F12.12: stage audit existe', stages.includes('audit'));
    assert('F12.13: stage replay existe', stages.includes('replay'));

    const r1 = await pipeline.processInteraction({});
    assert('F12.14: processInteraction sem params = falha controlada', r1.ok === false);

    const r2 = await pipeline.processInteraction({
      content: 'preciso de relatório urgente até amanhã',
      companyId: 'test-pipeline',
      sourceType: 'chat_impetus'
    });
    assert('F12.15: pipeline processa interação completa', r2.ok === true);
    assert('F12.16: pipeline tem stages', !!r2.stages);
    assert('F12.17: pipeline tem communication', r2.stages.communication?.ok === true);
    assert('F12.18: pipeline tem cognition', r2.stages.cognition?.ok === true);
    assert('F12.19: pipeline tem governance', r2.stages.governance?.ok === true);
    assert('F12.20: pipeline tem durationMs', typeof r2.durationMs === 'number');

    const health = pipeline.getHealth();
    assert('F12.21: health retorna enabled', health.enabled === true);
    assert('F12.22: health tem services', !!health.services);
    assert('F12.23: health.services.ingestion', health.services.ingestion !== undefined);
    assert('F12.24: health.services.orchestrator', health.services.orchestrator !== undefined);
    assert('F12.25: health.services.explainability', health.services.explainability !== undefined);
    assert('F12.26: health.services.observability', health.services.observability !== undefined);
  } catch (err) {
    assert('F12.X: falha inesperada - ' + err.message, false);
  }

  // ═══════════════════════════════════════════════
  // VALIDAÇÕES TRANSVERSAIS (Princípios Absolutos)
  // ═══════════════════════════════════════════════
  console.log('\n── Validações Transversais ──');

  try {
    const tools = require('../services/operational/operationalToolRegistry');
    assert('T1: Tool Calling default desabilitado (shadow first)', tools.isEnabled() === false || tools.isShadowMode() === true);
  } catch (err) {
    assert('T1: Tool Calling governance verificável', false);
  }

  try {
    const assistance = require('../services/operational/operationalAssistanceRuntime');
    assert('T2: LGPD block contém proibições', assistance.ETHICAL_BLOCK.includes('NUNCA'));
    assert('T3: FORBIDDEN_ANALYSIS inclui culpa', assistance.FORBIDDEN_ANALYSIS.includes('culpa_individual'));
    assert('T4: FORBIDDEN_ANALYSIS inclui ranking', assistance.FORBIDDEN_ANALYSIS.includes('ranking_individual'));
  } catch (err) {
    assert('T2-4: validação ética', false);
  }

  try {
    const pipeline = require('../services/operational/unifiedOperationalPipeline');
    assert('T5: pipeline stages incluem governance', pipeline.PIPELINE_STAGES.includes('governance'));
    assert('T6: pipeline stages incluem audit', pipeline.PIPELINE_STAGES.includes('audit'));
  } catch (err) {
    assert('T5-6: pipeline governance', false);
  }

  // ═══════════════════════════════════════════════
  // RESULTADO FINAL
  // ═══════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  RESULTADO: ${passed} aprovados | ${failed} falharam`);
  if (errors.length) {
    console.log('  FALHAS:');
    errors.forEach(e => console.log(`    → ${e}`));
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
})();
