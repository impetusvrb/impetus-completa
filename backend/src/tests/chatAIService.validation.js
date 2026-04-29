'use strict';

/**
 * ETAPA 6.2 — Validação isolada de chatAIService.consolidated.js (shadow testing)
 *
 * Executar a partir da raiz do backend:
 *   node src/tests/chatAIService.validation.js
 *
 * Garantias de isolamento neste ficheiro:
 * - Sem alteração a chatAIService.js, server.js ou rotas
 * - OpenAI: resposta simulada (nunca rede)
 * - chatService/db: mocks (sem persistência real)
 * - Orquestrador: mock (sem módulo real)
 *
 * [REQUIRES_MANUAL_REVIEW] Qualquer divergência reportada no relatório final abaixo.
 */

const path = require('path');
const Module = require('module');

const consolidatedPath = path.resolve(__dirname, '../services/chatAIService.consolidated.js');

/** Resposta OpenAI obrigatória (conforme prompt ETAPA 6.2) */
const mockOpenAIResponse = {
  choices: [{ message: { content: 'Resposta simulada da IA' } }]
};

const mockIO = {
  to: () => ({
    emit: (event, data) => {
      console.log('[MOCK_IO_EMIT]', event, typeof data === 'object' ? JSON.stringify(data) : data);
    }
  })
};

/** Contadores para contrato / shadow */
let mockMetrics = {
  openaiCreateCalls: 0,
  saveMessageCalls: 0,
  getMessagesCalls: 0,
  dbQueryCalls: 0,
  orchestratorCalls: 0
};

function resetMetrics() {
  mockMetrics = {
    openaiCreateCalls: 0,
    saveMessageCalls: 0,
    getMessagesCalls: 0,
    dbQueryCalls: 0,
    orchestratorCalls: 0
  };
}

/** Comportamento mutável para cenário de falha OpenAI */
const openAiBehavior = {
  async create(opts) {
    mockMetrics.openaiCreateCalls += 1;
    if (openAiBehavior._failNext) {
      throw new Error('simulated OpenAI failure');
    }
    return mockOpenAIResponse;
  }
};

const mockOpenAIInstance = {
  chat: {
    completions: {
      create: (...args) => openAiBehavior.create(...args)
    }
  }
};

function MockOpenAI() {
  return mockOpenAIInstance;
}

const mockDb = {
  async query(sql, params) {
    mockMetrics.dbQueryCalls += 1;
    console.log('[MOCK_DB_QUERY]', String(sql).slice(0, 80), params);
    return { rows: [{ company_id: 'mock-company-uuid' }] };
  }
};

const mockChatService = {
  AI_USER_ID: '00000000-0000-0000-0000-000000000001',
  async getMessages(conversationId, _aiUserId, _limit) {
    mockMetrics.getMessagesCalls += 1;
    console.log('[MOCK_chatService.getMessages]', conversationId);
    return [];
  },
  async saveMessage(data) {
    mockMetrics.saveMessageCalls += 1;
    console.log('[MOCK_DB_SAVE]', JSON.stringify(data));
    return { id: 'mock-saved-msg', mocked: true, ...data };
  }
};

const mockDocumentContext = {
  getImpetusLGPDComplianceProtocol() {
    return 'Protocolo LGPD de teste (mock)';
  }
};

/**
 * Prompt pedia { process }; o consolidado usa processWithOrchestrator.
 * [RISK_DETECTED] Divergência de nome de método vs especificação do script de validação.
 */
const mockOrchestrator = {
  async processWithOrchestrator(_payload) {
    mockMetrics.orchestratorCalls += 1;
    console.log('[MOCK_ORCHESTRATOR] processWithOrchestrator invoked');
    return 'Resposta simulada do orquestrador';
  },
  async process() {
    return {
      ok: true,
      response: 'Resposta simulada do orquestrador'
    };
  }
};

/** Patch permanente durante o script: require dinâmico dentro de handleAIMessage corre após o load. */
function installPersistentMockRequire() {
  const original = Module.prototype.require;
  Module.prototype.require = function patchedRequire(id) {
    const fn = this.filename;
    const isConsolidated =
      fn === consolidatedPath || (fn && fn.replace(/\\/g, '/').endsWith('chatAIService.consolidated.js'));
    if (isConsolidated) {
      if (id === 'openai') return MockOpenAI;
      if (id === '../db') return mockDb;
      if (id === './chatService') return mockChatService;
      if (id === './documentContext') return mockDocumentContext;
      if (id === './aiOrchestratorService') return mockOrchestrator;
    }
    return original.apply(this, arguments);
  };
  return () => {
    Module.prototype.require = original;
  };
}

function unloadConsolidated() {
  delete require.cache[consolidatedPath];
}

function loadConsolidated(envSnapshot) {
  unloadConsolidated();
  const prev = {};
  for (const [k, v] of Object.entries(envSnapshot)) {
    prev[k] = process.env[k];
    if (v === undefined || v === null) delete process.env[k];
    else process.env[k] = String(v);
  }
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(consolidatedPath);
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const report = {
  scenarios: [],
  failures: [],
  risks: [],
  contractFlags: []
};

function recordScenario(name, ok, detail) {
  report.scenarios.push({ name, ok, detail });
  if (!ok) report.failures.push({ name, detail });
}

function risk(msg) {
  report.risks.push(msg);
  console.warn('// [RISK_DETECTED]', msg);
}

function contractIssue(msg) {
  report.contractFlags.push(msg);
  console.warn('// [CONTRACT_INCONSISTENCY]', msg);
}

function summarizeReturn(label, ret) {
  const t = typeof ret;
  if (ret && typeof ret === 'object' && 'ok' in ret && ret.ok === false) {
    return `${label}: object com ok=false (message=${ret.message})`;
  }
  if (ret && typeof ret === 'object' && ret.mocked) {
    return `${label}: object mock saveMessage (type=${t})`;
  }
  return `${label}: type=${t}`;
}

async function main() {
  const originalEnv = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AI_ORCHESTRATOR_ENABLED: process.env.AI_ORCHESTRATOR_ENABLED
  };
  const uninstallMockRequire = installPersistentMockRequire();
  let exitCode = 0;

  try {
    console.log('=== chatAIService.consolidated — validação isolada (6.2) ===\n');

  // ——— Cenário 1: fluxo básico (string — contrato legado) ———
  resetMetrics();
  openAiBehavior._failNext = false;
  const envBase = {
    OPENAI_API_KEY: 'mock-key-no-external-call',
    AI_ORCHESTRATOR_ENABLED: 'false'
  };
  let svc = loadConsolidated(envBase);
  try {
    const ret = await svc.handleAIMessage('conv1', 'Olá IA', mockIO);
    const ok = ret && (ret.mocked === true || (typeof ret === 'object' && ret.content));
    recordScenario(
      '1_fluxo_basico_string',
      ok,
      `${summarizeReturn('retorno', ret)}; mockMetrics=${JSON.stringify(mockMetrics)}`
    );
    if (mockMetrics.openaiCreateCalls < 1) {
      recordScenario('1_fluxo_basico_string_openai_calls', false, 'OpenAI mock não foi chamado');
    }
    if (mockMetrics.saveMessageCalls < 1) contractIssue('saveMessage não registado como esperado');
  } catch (e) {
    recordScenario('1_fluxo_basico_string', false, e.message);
  }

  // ——— Cenário 1b: objeto como triggerMessage (pedido no prompt 6.2 vs contrato real) ———
  resetMetrics();
  openAiBehavior._failNext = false;
  unloadConsolidated();
  svc = loadConsolidated(envBase);
  try {
    const ret = await svc.handleAIMessage('conv1', { content: 'Olá IA' }, mockIO);
    contractIssue(
      'handleAIMessage(conv, {content}, io) coage objeto para string "[object Object]" em sanitizeContent — legado espera string.'
    );
    recordScenario(
      '1b_prompt_com_objeto_nao_canonico',
      ret !== undefined,
      summarizeReturn('retorno', ret)
    );
  } catch (e) {
    recordScenario('1b_prompt_com_objeto_nao_canonico', false, e.message);
  }

  // ——— Cenário 2: “sem trigger IA” — handleAIMessage não usa mentionsAI ———
  resetMetrics();
  openAiBehavior._failNext = false;
  unloadConsolidated();
  svc = loadConsolidated(envBase);
  const mentionsNormal = svc.mentionsAI('Mensagem normal');
  const callsBefore = mockMetrics.openaiCreateCalls;
  try {
    await svc.handleAIMessage('conv2', 'Mensagem normal', mockIO);
  } catch (e) {
    recordScenario('2_sem_trigger_via_handleAI', false, e.message);
  }
  risk(
    'handleAIMessage não consulta mentionsAI; qualquer chamada com OPENAI setada dispara pipeline (getMessages + LLM). Gatilho é responsabilidade do caller.'
  );
  recordScenario(
    '2_sem_trigger_mentionsAI_false',
    mentionsNormal === false,
    `mentionsAI('Mensagem normal')=${mentionsNormal}; openaiCreateCalls após handle=${mockMetrics.openaiCreateCalls - callsBefore}`
  );

  // ——— Cenário 3: falha OpenAI ———
  resetMetrics();
  openAiBehavior._failNext = true;
  unloadConsolidated();
  svc = loadConsolidated(envBase);
  try {
    const ret = await svc.handleAIMessage('conv3', 'texto', mockIO);
    const hasOkFalse = ret && typeof ret === 'object' && ret.ok === false;
    const savedErrMsg =
      ret &&
      typeof ret === 'object' &&
      ret.content === 'Erro ao processar solicitação.' &&
      ret.mocked === true;
    const ok = hasOkFalse || savedErrMsg;
    recordScenario(
      '3_falha_openai_fallback',
      ok,
      `${summarizeReturn('retorno', ret)} — esperado: saveMessage de erro OU {ok:false}`
    );
    if (!ok) contractIssue('[CONTRACT_INCONSISTENCY] retorno de falha não bate com ambos os formatos documentados');
  } catch (e) {
    recordScenario('3_falha_openai_fallback', false, `excepção não capturada: ${e.message}`);
  }
  openAiBehavior._failNext = false;

  // ——— Cenário 4: orquestrador ativo ———
  resetMetrics();
  unloadConsolidated();
  svc = loadConsolidated({
    OPENAI_API_KEY: 'mock-key-no-external-call',
    AI_ORCHESTRATOR_ENABLED: 'true'
  });
  try {
    const ret = await svc.handleAIMessage('conv4', 'usar orquestrador', mockIO);
    const ok = mockMetrics.orchestratorCalls >= 1 && ret && ret.mocked;
    recordScenario(
      '4_orquestrador_ativo',
      ok,
      `orchestratorCalls=${mockMetrics.orchestratorCalls}; openaiCreateCalls=${mockMetrics.openaiCreateCalls}; ${summarizeReturn('ret', ret)}`
    );
    if (ok && mockMetrics.openaiCreateCalls > 0) {
      risk('Com orquestrador bem-sucedido, OpenAI não devia ser necessário; verificar ordem dos ramos.');
    }
  } catch (e) {
    recordScenario('4_orquestrador_ativo', false, e.message);
  }

  // ——— Cenário 5: mentionsAI ———
  unloadConsolidated();
  svc = loadConsolidated(envBase);
  const mentionsCases = [
    { input: 'IA', expected: false, note: 'só "IA" sem @ — regex exige @ia com limite de palavra' },
    { input: '@ia', expected: true, note: 'gatilho legado' },
    { input: 'teste', expected: false, note: 'negativo' },
    { input: 'fale com impetus ia', expected: true, note: 'padrão oficial impetus\\s*ia' },
    {
      input: 'user@example.com',
      expected: false,
      note: 'email comum não deve disparar (sem subcadeia @ia\\b); [REQUIRES_MANUAL_REVIEW] outros formatos'
    },
    {
      input: 'pergunta @ia sobre o turno',
      expected: true,
      note: 'menção explícita inline'
    }
  ];
  for (const c of mentionsCases) {
    const got = svc.mentionsAI(c.input);
    const ok = got === c.expected;
    recordScenario(`mentionsAI:${JSON.stringify(c.input)}`, ok, `got=${got} expected=${c.expected} (${c.note})`);
  }

    // ——— Restaurar env ———
    for (const [k, v] of Object.entries(originalEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }

    // ===================== ETAPA 6 — Relatório final =====================
    const failed = report.scenarios.filter((s) => !s.ok);

    console.log('\n========== RELATÓRIO FINAL (ETAPA 6.2) ==========');
    console.log('\n1) Cenários executados:', report.scenarios.length);
    for (const s of report.scenarios) {
      console.log(`   [${s.ok ? 'OK' : 'FALHA'}] ${s.name}: ${s.detail}`);
    }
    console.log('\n2) Falhas encontradas:', failed.length);
    failed.forEach((f) => console.log('  // [REQUIRES_MANUAL_REVIEW]', f.name, f.detail));

    console.log('\n3) Diferenças comportamentais relevantes:');
    console.log(
      '   - handleAIMessage espera triggerMessage string (legado); objeto provoca [object Object] no user message.'
    );
    console.log('   - mentionsAI união oficial+legado; @ia\\b pode gerar falsos positivos em emails.');
    console.log('   - Orquestrador: API real é processWithOrchestrator (não "process" só).');

    console.log('\n4) Problemas de integração com orquestrador:');
    console.log(
      '   // [RISK_DETECTED] Módulo real ./aiOrchestratorService pode não existir no backend; aqui mockado.'
    );

    console.log('\n5) Problemas de contrato:');
    report.contractFlags.forEach((c) => console.log('   // [CONTRACT_INCONSISTENCY]', c));

    console.log('\n6) Riscos detectados:');
    report.risks.forEach((r) => console.log('  ', r));

    const integracaoOk =
      failed.length === 0 &&
      report.contractFlags.length === 0 &&
      report.risks.length === 0;
    console.log('\n7) PRONTO PARA INTEGRAÇÃO:', integracaoOk ? 'SIM' : 'NÃO');
    console.log(
      integracaoOk
        ? 'Justificativa: todos os cenários passaram; sem flags de contrato nem riscos registados.'
        : 'Justificativa: existem falhas de cenário, flags [CONTRACT_INCONSISTENCY] ou [RISK_DETECTED] — rever manualmente antes de trocar require em produção.'
    );
    if (!integracaoOk) {
      console.log('   // [REQUIRES_MANUAL_REVIEW] consolidar decisão sobre objeto vs string e regex mentionsAI');
    }

    exitCode = failed.length > 0 ? 1 : 0;
  } finally {
    uninstallMockRequire();
  }

  process.exit(exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
