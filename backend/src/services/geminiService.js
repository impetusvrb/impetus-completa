const fs = require('fs');
    const { GoogleGenAI } = require('@google/genai');
const db = require('../db');

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const SUPERVISOR_MODEL = process.env.GEMINI_SUPERVISOR_MODEL || 'gemini-2.5-flash';

function isVertexEnabled() {
  const v = String(process.env.GOOGLE_GENAI_USE_VERTEXAI || '').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function getClient() {
  const apiKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  const useVertex = isVertexEnabled();
  if (useVertex) {
    const project = (process.env.GOOGLE_CLOUD_PROJECT || '').trim();
    const location = (process.env.GOOGLE_CLOUD_LOCATION || 'global').trim();
    if (!project) return null;
    return new GoogleGenAI({
      vertexai: true,
      project,
      location
    });
  }
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function isAvailable() {
  return !!getClient();
}

async function generateText(prompt, opts = {}) {
  const client = getClient();
  if (!client) return null;
  const model = opts.model || DEFAULT_MODEL;
  try {
    const response = await client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: String(prompt || '') }] }]
    });
    return response?.text || null;
  } catch (err) {
    console.warn('[GEMINI] generateText:', err?.message);
    return null;
  }
}

async function analyzeImage(imageBase64, prompt = 'Analise esta imagem.', mimeType = 'image/jpeg') {
  const client = getClient();
  if (!client) return null;
  try {
    const raw = String(imageBase64 || '');
    const fromDataUrl = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const resolvedMime = fromDataUrl ? fromDataUrl[1] : mimeType;
    const data = raw.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: resolvedMime || 'image/jpeg', data } }
        ]
      }]
    });
    return response?.text || null;
  } catch (err) {
    console.warn('[GEMINI] analyzeImage:', err?.message);
    return null;
  }
}

async function analyzeSensorData(sensorData, context = {}) {
  const prompt = `Analise os dados industriais abaixo e responda SOMENTE JSON:
{"nivel_risco":"baixo|medio|alto|critico","anomalias":["..."],"recomendacao":"...","prioridade":"baixa|media|alta|urgente"}

Contexto: ${JSON.stringify(context || {})}
Sensores: ${JSON.stringify(sensorData || {})}`;
  const raw = await generateText(prompt);
  const parsed = extractJson(raw);
  if (parsed) return parsed;
  return raw ? { nivel_risco: 'medio', anomalias: [], recomendacao: raw, prioridade: 'media' } : null;
}

async function extractStructuredFromImage(imageBase64, contextText = '') {
  const prompt = `Extraia dados operacionais desta imagem e retorne SOMENTE JSON:
{"category":"equipamento|processo|custo|material|fornecedor|documentacao|outro","summary":"...","extracted_data":{}}

Contexto adicional: ${String(contextText || '').slice(0, 1000)}`;
  const raw = await analyzeImage(imageBase64, prompt);
  const parsed = extractJson(raw);
  return parsed || null;
}

async function interpretFileForCadastro(filePath, opts = {}) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const ext = String(filePath).toLowerCase();
  if (!ext.endsWith('.png') && !ext.endsWith('.jpg') && !ext.endsWith('.jpeg') && !ext.endsWith('.webp')) {
    return null;
  }
  const b64 = fs.readFileSync(filePath).toString('base64');
  return extractStructuredFromImage(`data:image/jpeg;base64,${b64}`, opts?.hint || '');
}

async function classifyRouting(payload = {}) {
  const prompt = `Você é a IMPETUS IA, supervisora do sistema industrial.
Regras obrigatórias:
- Você tem acesso aos dados internos fornecidos.
- Nunca diga que não tem acesso ao sistema.
- Nunca invente dados.
- Respeite hierarquia de acesso.
- Sempre baseie resposta no contexto.

Classifique a mensagem e retorne SOMENTE JSON:
{
  "event_type":"machine_stop|part_failure|purchase_need|rework_needed|informational|other",
  "severity":"low|medium|high|critical",
  "notify_roles":["mecanico","compras","pcm","supervisor"],
  "should_create_task":true,
  "task_title":"...",
  "task_description":"...",
  "needs_purchase":false,
  "needs_rework":false
}

Mensagem: ${String(payload.text || '').slice(0, 1500)}
Contexto: ${JSON.stringify(payload.context || {})}`;
  const raw = await generateText(prompt);
  return extractJson(raw);
}

async function montarContexto(opts = {}) {
  const {
    empresa_id: companyId,
    usuario: userRole = '',
    user_id: userId = null,
    conversas = true,
    manuais = true,
    maquinas = true
  } = opts;
  if (!companyId) return {};

  const context = {
    empresa_id: companyId,
    usuario: userRole,
    generated_at: new Date().toISOString()
  };

  if (conversas) {
    try {
      const r = await db.query(
        `SELECT m.content, m.created_at, u.name AS sender_name
         FROM chat_messages m
         LEFT JOIN users u ON u.id = m.sender_id
         LEFT JOIN chat_conversations c ON c.id = m.conversation_id
         WHERE c.company_id = $1
         ORDER BY m.created_at DESC
         LIMIT 20`,
        [companyId]
      );
      context.conversas_recentes = (r.rows || []).map((x) => ({
        content: String(x.content || '').slice(0, 300),
        sender: x.sender_name || 'sistema',
        created_at: x.created_at
      }));
    } catch (err) {
      console.warn('[geminiService][context_conversas]', err?.message ?? err);
      context.conversas_recentes = [];
    }
  }

  if (maquinas) {
    try {
      const r = await db.query(
        `SELECT event_type, machine_name, machine_code, part_code, severity, created_at
         FROM operational_events
         WHERE company_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [companyId]
      );
      context.eventos_operacionais = r.rows || [];
    } catch (err) {
      console.warn('[geminiService][context_eventos]', err?.message ?? err);
      context.eventos_operacionais = [];
    }
  }

  if (manuais) {
    try {
      const r = await db.query(
        `SELECT title, summary, created_at
         FROM structural_knowledge_documents
         WHERE company_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [companyId]
      );
      const docs = r.rows || [];
      if (!docs.length) {
        console.warn('[STRUCTURAL_KNOWLEDGE_EMPTY]', { company_id: companyId });
      }
      context.manuais = docs;
    } catch (err) {
      console.warn('[STRUCTURAL_KNOWLEDGE_MISSING]', err?.message ?? err);
      context.manuais = [];
    }
  }

  try {
    const team = await db.query(
      `SELECT id, name, role, hierarchy_level, department
       FROM users
       WHERE company_id = $1 AND active = true AND deleted_at IS NULL
       ORDER BY hierarchy_level ASC NULLS LAST, name ASC
       LIMIT 80`,
      [companyId]
    );
    context.equipe = team.rows || [];
  } catch (err) {
    console.warn('[geminiService][context_equipe]', err?.message ?? err);
    context.equipe = [];
  }

  if (userId) {
    context.requester_id = userId;
  }
  return context;
}

/**
 * Classifica a reacção humana (texto, transcrição ou descrição de gesto) face à última sugestão da IA.
 * Retorno: { intent: 'ACCEPTED'|'REJECTED'|'ADJUSTED'|'NONE', confidence, evidence_quote, reason_pt }
 */
async function classifyHumanLoopReaction(opts = {}) {
  const assistantSummary = String(opts.assistantSummary || '').slice(0, 2000);
  const userUtterance = String(opts.userUtterance || '').slice(0, 2000);
  const gestureDescription = opts.gestureDescription ? String(opts.gestureDescription).slice(0, 1200) : '';
  if (!userUtterance.trim() && !gestureDescription.trim()) {
    return { intent: 'NONE', confidence: 0, evidence_quote: '', reason_pt: 'Sem conteúdo humano.' };
  }
  const gestureBlock = gestureDescription
    ? `\nDescrição do gesto ou expressão (vídeo/análise visual): ${gestureDescription}`
    : '';
  const prompt = `És a supervisora Gemini do sistema industrial IMPETUS (governança e segurança).

O assistente acabou de apresentar esta sugestão ou resumo ao utilizador:
"""
${assistantSummary}
"""

A reacção humana AGORA é:
"""
${userUtterance || '(apenas gesto/expressão — ver abaixo)'}
"""${gestureBlock}

Tarefa: determina se a reacção é uma resposta DIRECTA a essa sugestão e qual a intenção operacional.
- ACCEPTED: concordância, autorização explícita ou implícita ("ok", "pode seguir", "de acordo", "execute", "faça", "aprovo").
- REJECTED: recusa ou discordância clara ("não", "discordo", "cancela", "não faças").
- ADJUSTED: aceita com ressalvas, condições ou pedido de alteração parcial.
- NONE: assunto diferente, nova pergunta não relacionada, cumprimento vago, ou não há relação com a sugestão.

Responde APENAS JSON válido:
{"intent":"ACCEPTED|REJECTED|ADJUSTED|NONE","confidence":0,"evidence_quote":"","reason_pt":""}
confidence: 0-100 (quão certa estás da classificação).`;

  const raw = await generateText(prompt, { model: opts.model || SUPERVISOR_MODEL });
  const parsed = extractJson(raw);
  if (parsed && typeof parsed === 'object' && parsed.intent) {
    const intent = String(parsed.intent).toUpperCase();
    const ok = ['ACCEPTED', 'REJECTED', 'ADJUSTED', 'NONE'];
    const intentNorm = ok.includes(intent) ? intent : 'NONE';
    let conf = parseInt(parsed.confidence, 10);
    if (Number.isNaN(conf)) conf = 60;
    conf = Math.max(0, Math.min(100, conf));
    return {
      intent: intentNorm,
      confidence: conf,
      evidence_quote: String(parsed.evidence_quote || userUtterance || gestureDescription).slice(0, 800),
      reason_pt: String(parsed.reason_pt || '').slice(0, 500)
    };
  }
  return null;
}

/**
 * Classifica se a mensagem é reclamação sobre qualidade da resposta da IA (supervisora).
 * @returns {Promise<{ is_complaint: boolean, incident_type: string, confidence: number, reason_pt?: string }|null>}
 */
async function classifyQualityComplaint(userMessage, opts = {}) {
  const prompt = `És um classificador de reclamações sobre respostas de IA numa plataforma industrial (IMPETUS).

Mensagem do utilizador:
"""
${String(userMessage || '').slice(0, 2000)}
"""

Decide se o utilizador está a REPORTAR um problema com a resposta anterior do assistente (ex.: alucinação, dados inventados ou incorretos, viés, tom inadequado, "isso está errado", "não confere", "estás a inventar").

NÃO é reclamação: nova pergunta técnica, pedido de explicação neutro, cumprimento, ou assunto diferente sem crítica à IA.

Responde APENAS JSON válido:
{"is_complaint":true|false,"incident_type":"ALUCINACAO|DADO_INCORRETO|VIES|COMPORTAMENTO_INADEQUADO|UNKNOWN","confidence":0,"reason_pt":""}

incident_type só importa se is_complaint for true:
- ALUCINACAO: factos inventados, sem fonte
- DADO_INCORRETO: números ou factos concretos errados
- VIES: parcialidade discriminatória
- COMPORTAMENTO_INADEQUADO: tom ofensivo ou inadequado
- UNKNOWN: reclamação genérica

confidence: 0-100`;

  const raw = await generateText(prompt, { model: opts.model || SUPERVISOR_MODEL });
  const parsed = extractJson(raw);
  if (parsed && typeof parsed === 'object') {
    let conf = parseInt(parsed.confidence, 10);
    if (Number.isNaN(conf)) conf = 0;
    conf = Math.max(0, Math.min(100, conf));
    const it = String(parsed.incident_type || 'UNKNOWN').toUpperCase();
    const okTypes = ['ALUCINACAO', 'DADO_INCORRETO', 'VIES', 'COMPORTAMENTO_INADEQUADO', 'UNKNOWN'];
    return {
      is_complaint: parsed.is_complaint === true || parsed.is_complaint === 'true',
      incident_type: okTypes.includes(it) ? it : 'UNKNOWN',
      confidence: conf,
      reason_pt: String(parsed.reason_pt || '').slice(0, 400)
    };
  }
  return null;
}

async function geminiSupervisor(contexto, pergunta, opts = {}) {
  const prompt = `Você é a IMPETUS IA, supervisora do sistema industrial.

REGRAS:
- Você tem acesso aos dados internos fornecidos abaixo.
- Nunca diga que não tem acesso ao sistema.
- Nunca invente dados.
- Respeite hierarquia de acesso.
- Sempre baseie a resposta no contexto.

DADOS DO SISTEMA:
${JSON.stringify(contexto || {}, null, 2)}

PERGUNTA:
${String(pergunta || '').slice(0, 2000)}`;

  return generateText(prompt, { model: opts.model || SUPERVISOR_MODEL });
}

function extractJson(raw) {
  if (!raw || typeof raw !== 'string') return null;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (err) {
    console.warn('[geminiService][extract_json]', err?.message ?? err);
    return null;
  }
}

module.exports = {
  isAvailable,
  generateText,
  analyzeImage,
  analyzeSensorData,
  extractStructuredFromImage,
  interpretFileForCadastro,
  classifyRouting,
  classifyHumanLoopReaction,
  classifyQualityComplaint,
  montarContexto,
  geminiSupervisor
};
