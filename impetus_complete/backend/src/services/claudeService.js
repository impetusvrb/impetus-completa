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

/**
 * Extrai fatos estruturados de um texto/conversa para memória operacional
 * @param {string} rawContent - Texto ou conversa bruta
 * @param {Object} meta - { sourceType, companyId, scopeHints }
 * @returns {Promise<Object|null>} { facts: [...], summary: string } ou null
 */
async function extractOperationalFacts(rawContent, meta = {}) {
  const { sourceType = 'generic', scopeHints = {} } = meta;

  const systemPrompt = `Você é um analista de inteligência operacional industrial. Sua tarefa é extrair fatos estruturados de textos e conversas.

REGRAS:
1. Retorne APENAS um JSON válido (sem markdown, sem texto extra).
2. Extraia fatos objetivos, verificáveis e úteis para operação.
3. Identifique: tarefas implícitas, pendências, riscos, decisões, solicitações, urgência.
4. Vincule a setor, máquina, linha, processo ou pessoa quando mencionado.
5. Classifique prioridade: baixa, normal, alta, critica.
6. Minimize ruído - não inclua fatos triviais ou irrelevantes.
7. Respeite sigilo - não exponha dados pessoais sensíveis.

FORMATO DE RESPOSTA (JSON):
{
  "summary": "resumo do que aconteceu em 1-2 frases",
  "facts": [
    {
      "fact_type": "pendencia|risco|decisao|solicitacao|falha|tarefa|informacao|observacao",
      "content": "descrição objetiva do fato",
      "scope_type": "user|sector|machine|line|process|org",
      "scope_id": "identificador se houver",
      "scope_label": "nome legível (ex: Linha 2, Máquina X)",
      "priority": "baixa|normal|alta|critica",
      "metadata": { "entities": [], "dates": [] }
    }
  ]
}`;

  const hints = Object.keys(scopeHints).length
    ? `\nContexto conhecido: ${JSON.stringify(scopeHints)}`
    : '';
  const userContent = `Fonte: ${sourceType}\n${hints}\n\nConteúdo:\n${(rawContent || '').slice(0, 8000)}`;

  const raw = await analyze(systemPrompt, userContent, { max_tokens: 2048, timeout: 30000 });
  if (!raw) return null;

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.facts || !Array.isArray(parsed.facts)) return null;
    return {
      summary: parsed.summary || '',
      facts: parsed.facts.filter((f) => f?.content && f?.fact_type)
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
