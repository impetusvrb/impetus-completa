/**
 * Serviço Claude via API - Motor analítico e cérebro de dados da empresa
 * Responsável por interpretar, estruturar, cruzar e memorizar dados internos.
 * Não substitui o ChatGPT (conversação) - Claude atua em bastidor.
 */
const Anthropic = require('@anthropic-ai/sdk');
const nexusWalletService = require('./nexusWalletService');
const billingTokenService = require('./billingTokenService');

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const WALLET_FALLBACK_MSG =
  'FALLBACK: Créditos Nexus IA insuficientes ou consumo em pausa. Peça ao administrador para recarregar a carteira (Nexus IA).';

// Circuit breakers separados: falhas no chat/análise não bloqueiam o painel pós-voz (e vice-versa).
let panelFailures = 0;
let panelLastFailureTime = 0;
let analyzeFailures = 0;
let analyzeLastFailureTime = 0;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 60000;

function isPanelCircuitOpen() {
  if (panelFailures < CIRCUIT_THRESHOLD) return false;
  if (Date.now() - panelLastFailureTime > CIRCUIT_RESET_MS) {
    panelFailures = 0;
    return false;
  }
  return true;
}

function isAnalyzeCircuitOpen() {
  if (analyzeFailures < CIRCUIT_THRESHOLD) return false;
  if (Date.now() - analyzeLastFailureTime > CIRCUIT_RESET_MS) {
    analyzeFailures = 0;
    return false;
  }
  return true;
}

/** Painel Claude pós-voz: API key + circuito só do painel */
function isAvailable() {
  return !!client && !isPanelCircuitOpen();
}

function getPanelUnavailableReason() {
  if (!client) return 'Claude não configurado (ANTHROPIC_API_KEY).';
  if (isPanelCircuitOpen()) {
    return 'API Claude instável (várias falhas seguidas). Tente de novo dentro de 1 minuto.';
  }
  return '';
}

async function nexusWalletPrecheckPanel(billing, estimatedUnits) {
  if (!billing?.companyId) return null;
  const r = await nexusWalletService.canConsumeEstimate(billing.companyId, 'claude', estimatedUnits);
  if (r.skipped || r.ok) return null;
  return WALLET_FALLBACK_MSG;
}

/**
 * Compatível com o formato de mensagens do painel (system + user), usando a API Messages da Anthropic.
 * @param {Array<{ role: string, content: string }>} messages
 * @param {{ max_tokens?: number, timeout?: number, billing?: { companyId: string, userId: string }, model?: string }} opts
 * @returns {Promise<string|null>} Texto (JSON) ou null em falha; string FALLBACK: se carteira bloquear.
 */
async function completeOpenAIStyleMessages(messages, opts = {}) {
  if (!client) return null;
  if (isPanelCircuitOpen()) return null;
  try {
    const circuitBreakerService = require('./circuitBreakerService');
    if (circuitBreakerService.shouldSkip('claude')) return null;
  } catch (_e) {
    /* ignore */
  }

  const maxTok = opts.max_tokens || 1200;
  const blocked = await nexusWalletPrecheckPanel(opts.billing, maxTok);
  if (blocked) return blocked;

  const arr = Array.isArray(messages) ? messages : [];
  const systemParts = [];
  const anthropicMessages = [];
  for (const m of arr) {
    const role = m.role;
    const text = String(m.content ?? '').trim();
    if (!text) continue;
    if (role === 'system') {
      systemParts.push(text);
    } else if (role === 'user' || role === 'assistant') {
      anthropicMessages.push({ role, content: text });
    }
  }
  if (!anthropicMessages.length) return null;

  const system = systemParts.length ? systemParts.join('\n\n') : undefined;
  const timeoutMs = opts.timeout || 45000;
  const model =
    opts.model ||
    process.env.SMART_PANEL_CLAUDE_MODEL ||
    process.env.ANTHROPIC_PANEL_MODEL ||
    'claude-sonnet-4-20250514';

  try {
    try {
      await require('../middleware/chaosRuntime').maybeRejectProvider('claude');
    } catch (_chaos) {
      try {
        const chaosRt = require('../middleware/chaosRuntime');
        if (chaosRt.shouldAffectCircuitBreaker()) {
          require('./circuitBreakerService').recordOutcome('claude', false);
        }
      } catch (_e) {
        /* ignore */
      }
      return null;
    }
    try {
      require('./circuitBreakerService').beginCall('claude');
    } catch (_e) {
      /* ignore */
    }

    /* A API Messages não aceita `signal` no body (400: Extra inputs are not permitted). */
    const createPromise = client.messages.create({
      model,
      max_tokens: maxTok,
      ...(system ? { system } : {}),
      messages: anthropicMessages
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    );
    const message = await Promise.race([createPromise, timeoutPromise]);
    panelFailures = 0;

    const usage = message.usage;
    if (opts.billing?.companyId && usage) {
      const total = (usage.input_tokens || 0) + (usage.output_tokens || 0);
      if (total > 0) {
        billingTokenService.registrarUsoSafe(
          opts.billing.companyId,
          opts.billing.userId,
          'claude',
          total
        );
      }
    }

    const textBlock = message.content?.find((b) => b.type === 'text');
    const panelOut = textBlock?.text?.trim() || null;
    try {
      const circuitBreakerService = require('./circuitBreakerService');
      circuitBreakerService.recordOutcome('claude', !!panelOut);
    } catch (_e) {
      /* ignore */
    }
    return panelOut;
  } catch (err) {
    panelFailures++;
    panelLastFailureTime = Date.now();
    console.warn('[CLAUDE_PANEL]', (err.message || String(err)).slice(0, 160));
    try {
      const circuitBreakerService = require('./circuitBreakerService');
      circuitBreakerService.recordOutcome('claude', false);
    } catch (_e) {
      /* ignore */
    }
    return null;
  }
}

/**
 * Chama Claude para processamento analítico (extração, classificação, interpretação)
 * @param {string} systemPrompt - Instruções do sistema
 * @param {string} userContent - Conteúdo a processar
 * @param {Object} opts - { model, max_tokens, timeout }
 * @returns {Promise<string|null>} Resposta de Claude ou null em falha
 */
async function analyze(systemPrompt, userContent, opts = {}) {
  if (!client) {
    console.warn('[CLAUDE] API não configurada (ANTHROPIC_API_KEY)');
    return null;
  }
  if (isAnalyzeCircuitOpen()) {
    console.warn('[CLAUDE] Circuit breaker (análise) aberto, pausando chamadas');
    return null;
  }
  try {
    const circuitBreakerService = require('./circuitBreakerService');
    if (circuitBreakerService.shouldSkip('claude')) {
      console.warn('[CLAUDE] Circuit breaker (provider) OPEN — análise ignorada');
      return null;
    }
  } catch (_e) {
    /* ignore optional CB */
  }

  try {
    const gate = require('../ai/orchestratorExecutionGate');
    gate.assertAnthropicInvocation(opts || {});
  } catch (e) {
    if (e && e.code === 'ARCHITECTURE_VIOLATION') throw e;
  }

  try {
    await require('../middleware/chaosRuntime').maybeRejectProvider('claude');
  } catch (_chaos) {
    try {
      const chaosRt = require('../middleware/chaosRuntime');
      if (chaosRt.shouldAffectCircuitBreaker()) {
        require('./circuitBreakerService').recordOutcome('claude', false);
      }
    } catch (_e) {
      /* ignore */
    }
    return null;
  }
  try {
    require('./circuitBreakerService').beginCall('claude');
  } catch (_e) {
    /* ignore */
  }

  const timeoutMs = opts.timeout || 45000;
  const maxTokens = opts.max_tokens || 2048;
  const model = opts.model || 'claude-sonnet-4-20250514';

  const t0 = Date.now();
  try {
    const createPromise = client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }]
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    );
    const message = await Promise.race([createPromise, timeoutPromise]);
    analyzeFailures = 0;

    const textBlock = message.content?.find((b) => b.type === 'text');
    try {
      require('./aiLatencyMonitor').recordLatency('claude', Date.now() - t0);
    } catch (_e) {
      /* ignore */
    }
    const outText = textBlock?.text?.trim() || null;
    try {
      const circuitBreakerService = require('./circuitBreakerService');
      circuitBreakerService.recordOutcome('claude', !!outText);
    } catch (_e) {
      /* ignore */
    }
    return outText;
  } catch (err) {
    try {
      require('./aiLatencyMonitor').recordLatency('claude', Date.now() - t0);
    } catch (_e) {
      /* ignore */
    }
    analyzeFailures++;
    analyzeLastFailureTime = Date.now();
    const msg = err.message || String(err);
    console.warn('[CLAUDE_ERROR]', msg.slice(0, 150), '| failures:', analyzeFailures);
    try {
      const circuitBreakerService = require('./circuitBreakerService');
      circuitBreakerService.recordOutcome('claude', false);
    } catch (_e) {
      /* ignore */
    }
    return null;
  }
}

const CORPORATE_EVENT_TYPES = [
  'tarefa', 'manutencao', 'falha', 'troca_peca', 'parada_maquina', 'parada_linha',
  'decisao', 'alerta', 'informacao', 'observacao', 'maquina_reiniciada'
];

/**
 * Extrai fatos estruturados e eventos corporativos de um texto/conversa
 * @returns {Promise<Object|null>} { facts, summary, corporate_events }
 */
async function extractOperationalFacts(rawContent, meta = {}) {
  const { sourceType = 'generic', scopeHints = {} } = meta;

  const systemPrompt = `Você é um analista de inteligência operacional industrial. Extraia fatos E eventos corporativos de textos e conversas.

REGRAS:
1. Retorne APENAS um JSON válido (sem markdown, sem \`\`\`).
2. Para TAREFAS: extraia responsável, ação, data e hora quando mencionados.
3. Para TROCA DE PEÇA: equipamento, linha, peça.
4. Para PARADA: equipamento ou linha.
5. Para MANUTENÇÃO: equipamento, linha, problema, causa, solução, peça trocada.
6. Use data/hora formato ISO ou YYYY-MM-DD e HH:MM.

FORMATO:
{
  "summary": "resumo",
  "facts": [{ "fact_type": "pendencia|risco|decisao|solicitacao|falha|tarefa|informacao|observacao", "content": "...", "scope_type": "...", "scope_label": "...", "priority": "baixa|normal|alta|critica", "metadata": {} }],
  "corporate_events": [{ "tipo_evento": "tarefa|manutencao|falha|troca_peca|parada_maquina|parada_linha|decisao|alerta", "descricao": "...", "equipamento": null, "linha": null, "usuario_responsavel": null, "data": null, "hora": null, "peca_trocada": null, "problema": null, "causa": null, "solucao": null }]
}
Inclua corporate_events APENAS quando houver evidência clara. Se não houver, retorne corporate_events: [].`;

  const hints = Object.keys(scopeHints).length ? `\nContexto: ${JSON.stringify(scopeHints)}` : '';
  const userContent = `Fonte: ${sourceType}\n${hints}\n\nConteúdo:\n${(rawContent || '').slice(0, 8000)}`;

  const raw = await analyze(systemPrompt, userContent, { max_tokens: 3072, timeout: 35000 });
  if (!raw) return null;

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.facts || !Array.isArray(parsed.facts)) return null;

    const corporateEvents = Array.isArray(parsed.corporate_events)
      ? parsed.corporate_events.filter((e) => e?.tipo_evento && CORPORATE_EVENT_TYPES.includes(e.tipo_evento))
      : [];

    return {
      summary: parsed.summary || '',
      facts: parsed.facts.filter((f) => f?.content && f?.fact_type),
      corporate_events: corporateEvents
    };
  } catch (err) {
    console.warn('[claudeService][extract_memory_facts]', err?.message ?? err);
    return null;
  }
}

/**
 * Gera contexto resumido para enriquecer o ChatGPT
 * @param {string} query - Pergunta do usuário
 * @param {Array} memoryFacts - Fatos da memória operacional já filtrados
 * @returns {Promise<string|null>} Bloco de texto para o system prompt ou null
 */
async function buildMemoryContextForChat(query, memoryFacts) {
  if (!memoryFacts || memoryFacts.length === 0) return null;
  if (!client || isAnalyzeCircuitOpen()) {
    // Fallback: montar bloco simples sem Claude
    const lines = memoryFacts.slice(0, 15).map((f) => `- [${f.fact_type}] ${f.content}`);
    return `## Memória operacional (contexto recente):\n${lines.join('\n')}`;
  }

  const systemPrompt = `Você recebe fatos da memória operacional da empresa. Crie um bloco de texto conciso e organizado para enriquecer o contexto do assistente de chat.

REGRAS:
- Organize por relevância para a pergunta.
- Seja conciso. Máximo 30 linhas.
- Destaque pendências, riscos e recorrências.
- Não invente dados. Use apenas os fatos fornecidos.`;

  const factsText = memoryFacts.slice(0, 30).map((f) => JSON.stringify(f)).join('\n');
  const userContent = `Pergunta do usuário: "${(query || '').slice(0, 500)}"\n\nFatos da memória:\n${factsText}`;

  const result = await analyze(systemPrompt, userContent, { max_tokens: 800, timeout: 15000 });
  if (!result) {
    const lines = memoryFacts.slice(0, 12).map((f) => `- [${f.fact_type}] ${f.content}`);
    return `## Memória operacional:\n${lines.join('\n')}`;
  }
  return `## Memória operacional (contexto inteligente):\n${result}`;
}

const DECISION_ENGINE_SYSTEM = `Você é o Motor de Decisão Inteligente do IMPETUS (análise industrial).
Responda de forma clara e objetiva em português. Priorize sempre segurança das pessoas.`;

/**
 * Interface compatível com decisionEngineService.analyzeWithAI (prompt único).
 * @param {string} userPrompt - Texto completo da situação e pedido
 * @param {Object} [opts] - { max_tokens, timeout }
 * @returns {Promise<string|null>}
 */
async function generate(userPrompt, opts = {}) {
  return analyze(DECISION_ENGINE_SYSTEM, String(userPrompt || '').slice(0, 12000), {
    max_tokens: opts.max_tokens || 1024,
    timeout: opts.timeout || 25000
  });
}

module.exports = {
  analyze,
  generate,
  extractOperationalFacts,
  buildMemoryContextForChat,
  completeOpenAIStyleMessages,
  isAvailable,
  getPanelUnavailableReason
};
