/**
 * Serviço Claude via API - Motor analítico e cérebro de dados da empresa
 * Responsável por interpretar, estruturar, cruzar e memorizar dados internos.
 * Não substitui o ChatGPT (conversação) - Claude atua em bastidor.
 */
const Anthropic = require('@anthropic-ai/sdk');

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Circuit Breaker: após 5 falhas consecutivas, pausa 60s
let failures = 0;
let lastFailureTime = 0;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 60000;

function isCircuitOpen() {
  if (failures < CIRCUIT_THRESHOLD) return false;
  if (Date.now() - lastFailureTime > CIRCUIT_RESET_MS) {
    failures = 0;
    return false;
  }
  return true;
}

function isAvailable() {
  return !!client && !isCircuitOpen();
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
  if (isCircuitOpen()) {
    console.warn('[CLAUDE] Circuit breaker aberto, pausando chamadas');
    return null;
  }

  const timeoutMs = opts.timeout || 45000;
  const maxTokens = opts.max_tokens || 2048;
  const model = opts.model || 'claude-sonnet-4-20250514';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    failures = 0;

    const textBlock = message.content?.find((b) => b.type === 'text');
    return textBlock?.text?.trim() || null;
  } catch (err) {
    failures++;
    lastFailureTime = Date.now();
    const msg = err.message || String(err);
    console.warn('[CLAUDE_ERROR]', msg.slice(0, 150), '| failures:', failures);
    return null;
  }
}

// Tipos de eventos corporativos (alinhados à knowledge_memory)
const CORPORATE_EVENT_TYPES = [
  'tarefa', 'manutencao', 'falha', 'troca_peca', 'parada_maquina', 'parada_linha',
  'decisao', 'alerta', 'informacao', 'observacao', 'maquina_reiniciada'
];

/**
 * Extrai fatos estruturados e eventos corporativos de um texto/conversa
 * @param {string} rawContent - Texto ou conversa bruta
 * @param {Object} meta - { sourceType, companyId, scopeHints }
 * @returns {Promise<Object|null>} { facts, summary, corporate_events } ou null
 */
async function extractOperationalFacts(rawContent, meta = {}) {
  const { sourceType = 'generic', scopeHints = {} } = meta;

  const systemPrompt = `Você é um analista de inteligência operacional industrial. Extraia fatos E eventos corporativos de textos e conversas.

REGRAS:
1. Retorne APENAS um JSON válido (sem markdown, sem \`\`\`).
2. Extraia fatos objetivos e eventos acionáveis.
3. Para TAREFAS: extraia responsável, ação, data e hora quando mencionados (ex: "Maria, segunda 8h faz retrabalho linha 3" → responsavel: Maria, descricao: retrabalho peça linha 3, data: próxima segunda, hora: 08:00).
4. Para TROCA DE PEÇA: equipamento, linha, peça (ex: "Troquei rolamento da bomba linha 2").
5. Para PARADA: equipamento ou linha, hora se mencionada.
6. Para MANUTENÇÃO: equipamento, linha, problema, causa, solução, peça trocada.
7. Use data/hora no formato ISO ou YYYY-MM-DD e HH:MM. Se só "segunda" → calcule próxima segunda como data.
8. Minimize ruído. Respeite sigilo.

FORMATO DE RESPOSTA (JSON):
{
  "summary": "resumo em 1-2 frases",
  "facts": [
    {
      "fact_type": "pendencia|risco|decisao|solicitacao|falha|tarefa|informacao|observacao",
      "content": "descrição objetiva",
      "scope_type": "user|sector|machine|line|process|org",
      "scope_id": null,
      "scope_label": "ex: Linha 2",
      "priority": "baixa|normal|alta|critica",
      "metadata": {}
    }
  ],
  "corporate_events": [
    {
      "tipo_evento": "tarefa|manutencao|falha|troca_peca|parada_maquina|parada_linha|decisao|alerta",
      "descricao": "texto descritivo",
      "equipamento": null,
      "linha": null,
      "usuario_responsavel": "nome se tarefa",
      "data": "YYYY-MM-DD ou null",
      "hora": "HH:MM ou null",
      "peca_trocada": "para troca_peca",
      "problema": "para manutencao/falha",
      "causa": "para manutencao",
      "solucao": "para manutencao"
    }
  ]
}

Inclua em corporate_events APENAS quando houver evidência clara no texto. Se não houver eventos corporativos, retorne corporate_events: [].`;

  const hints = Object.keys(scopeHints).length
    ? `\nContexto conhecido: ${JSON.stringify(scopeHints)}`
    : '';
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
  } catch {
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
  if (!client || isCircuitOpen()) {
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

module.exports = {
  analyze,
  extractOperationalFacts,
  buildMemoryContextForChat,
  isAvailable
};
