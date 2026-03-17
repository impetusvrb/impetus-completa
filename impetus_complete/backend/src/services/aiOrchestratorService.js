/**
 * AI_ORCHESTRATOR - Orquestração da Tríade de IAs
 * Claude (análise dados) | Gemini (multimodal) | ChatGPT (conversação)
 *
 * Fluxo: Usuário → ChatGPT classifica → consulta Claude ou Gemini → ChatGPT responde
 * Preserva fluxo atual quando AI_ORCHESTRATOR_ENABLED=false
 * Armazena insights em enterprise_ai_memory quando companyId disponível
 */
const db = require('../db');
const ai = require('./ai');
const claudeService = require('./claudeService');
const geminiService = require('./geminiService');
const documentContext = require('./documentContext');

const QUESTION_TYPE_DATA = 'data';
const QUESTION_TYPE_PHYSICAL = 'physical';
const QUESTION_TYPE_GENERAL = 'general';

// Palavras-chave para classificação (dados estruturados)
const DATA_KEYWORDS = [
  'produção', 'producao', 'produtividade', 'eficiência', 'eficiencia',
  'custo', 'custos', 'financeiro', 'perda', 'perdas', 'gargalo',
  'dashboard', 'indicador', 'kpi', 'meta', 'gráfico', 'grafico',
  'manutenção', 'manutencao', 'logística', 'logistica', 'estoque',
  'falhas operacionais', 'dados', 'registros', 'histórico', 'historico'
];

// Palavras-chave para classificação (operação física)
const PHYSICAL_KEYWORDS = [
  'máquina', 'maquina', 'equipamento', 'linha', 'sensor', 'câmera', 'camera',
  'vídeo', 'video', 'imagem', 'foto', 'painel', 'display', 'vibração', 'vibracao',
  'ruído', 'ruido', 'parada', 'funcionando', 'operando', 'visual'
];

function classifyQuestion(text, hasImage = false) {
  if (!text || typeof text !== 'string') return QUESTION_TYPE_GENERAL;
  const lower = text.toLowerCase().trim();

  // Se há imagem, priorizar Gemini (supervisão multimodal)
  if (hasImage) return QUESTION_TYPE_PHYSICAL;

  const dataScore = DATA_KEYWORDS.filter((k) => lower.includes(k)).length;
  const physicalScore = PHYSICAL_KEYWORDS.filter((k) => lower.includes(k)).length;

  if (physicalScore > dataScore) return QUESTION_TYPE_PHYSICAL;
  if (dataScore > 0) return QUESTION_TYPE_DATA;
  return QUESTION_TYPE_GENERAL;
}

async function storeInMemory(companyId, sourceAi, tipo, conteudo) {
  if (!companyId) return;
  try {
    await db.query(
      `INSERT INTO enterprise_ai_memory (company_id, source_ai, tipo, conteudo) VALUES ($1, $2, $3, $4)`,
      [companyId, sourceAi, tipo, (conteudo || '').slice(0, 8000)]
    );
  } catch (err) {
    if (err.code !== '42P01') console.warn('[AI_ORCHESTRATOR] storeInMemory:', err.message);
  }
}

/**
 * Consulta Claude para análise de dados
 */
async function consultClaude(query, contextData = {}) {
  if (!claudeService.isAvailable()) return null;
  const systemPrompt = `Você é especialista em análise de dados operacionais industriais.
Analise a pergunta e forneça insights baseados em dados de produção, manutenção, logística, custos e indicadores.
Seja objetivo. Retorne análise estruturada que será usada para resposta ao usuário.`;
  return claudeService.analyze(systemPrompt, query, { max_tokens: 800 });
}

/**
 * Consulta Gemini para análise multimodal (imagem/vídeo)
 */
async function consultGemini(imageBase64, query, opts = {}) {
  if (!geminiService.isAvailable()) return null;
  return geminiService.analyzeImage(imageBase64, query, opts);
}

/**
 * Processa mensagem via orquestrador
 * @param {Object} opts - { message, history, imageBase64, companyId, userName, extraContext }
 * @returns {Promise<string>} resposta final
 */
async function processWithOrchestrator(opts) {
  const {
    message = '',
    history = [],
    imageBase64 = null,
    companyId = null,
    userName = 'Usuário',
    extraContext = ''
  } = opts;

  const questionType = classifyQuestion(message, !!imageBase64);
  let backendAnalysis = null;

  // 1. Consultar IA especializada
  if (questionType === QUESTION_TYPE_DATA && claudeService.isAvailable()) {
    backendAnalysis = await consultClaude(message, { companyId });
  } else if ((questionType === QUESTION_TYPE_PHYSICAL || imageBase64) && geminiService.isAvailable()) {
    if (imageBase64) {
      backendAnalysis = await consultGemini(imageBase64, message || 'Analise esta imagem e descreva.');
    } else if (claudeService.isAvailable()) {
      backendAnalysis = await consultClaude(message, { companyId });
    }
  } else if (claudeService.isAvailable()) {
    backendAnalysis = await consultClaude(message, { companyId });
  }

  // 2. Armazena análise em enterprise_ai_memory (quando companyId disponível)
  if (companyId && backendAnalysis) {
    const sourceAi = questionType === QUESTION_TYPE_DATA ? 'claude' : questionType === QUESTION_TYPE_PHYSICAL ? 'gemini' : 'chatgpt';
    const memoryTipo = questionType === QUESTION_TYPE_DATA ? 'analise' : questionType === QUESTION_TYPE_PHYSICAL ? 'evento' : 'insight';
    storeInMemory(companyId, sourceAi, memoryTipo, backendAnalysis).catch(() => {});
  }

  // 3. ChatGPT sintetiza resposta (contexto do backend + extraContext)
  const contextBlocks = [];
  if (extraContext) contextBlocks.push(extraContext);
  if (backendAnalysis) {
    contextBlocks.push(`## Análise especializada (Claude/Gemini):\n${backendAnalysis}`);
  }

  const systemExtra = contextBlocks.length
    ? `\n\nUse o contexto abaixo para enriquecer sua resposta. Seja natural e objetivo.\n${contextBlocks.join('\n\n')}`
    : '';

  const lgpdProtocol = documentContext.getImpetusLGPDComplianceProtocol();
  const lgpdBlock = lgpdProtocol ? `\n\n---\nPROTOCOLO OBRIGATÓRIO - LGPD E ÉTICA DA IA:\n${lgpdProtocol}` : '';

  const systemPrompt = `Você é o Impetus IA, assistente de inteligência operacional industrial.${lgpdBlock}${systemExtra}
Responda em português, de forma natural e técnica quando apropriado.`;

  if (imageBase64 && !backendAnalysis) {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map((h) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: typeof h.content === 'string' ? h.content : String(h.content)
      })),
      {
        role: 'user',
        content: [
          { type: 'text', text: `${userName}: ${message || 'Analise esta imagem.'}` },
          { type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } }
        ]
      }
    ];
    return ai.chatWithVision(messages, { max_tokens: 1024 });
  }

  const historyBlock = history.slice(-6).map((h) => {
    const role = h.role === 'assistant' ? 'Assistente' : userName;
    return `${role}: ${typeof h.content === 'string' ? h.content : String(h.content)}`;
  }).join('\n');

  const fullPrompt = `${systemPrompt}\n\n---\nHistórico:\n${historyBlock || '(sem histórico)'}\n\n${userName}: ${message}`;
  return ai.chatCompletion(fullPrompt, { max_tokens: 1024 });
}

module.exports = {
  classifyQuestion,
  consultClaude,
  consultGemini,
  processWithOrchestrator,
  QUESTION_TYPE_DATA,
  QUESTION_TYPE_PHYSICAL,
  QUESTION_TYPE_GENERAL
};
