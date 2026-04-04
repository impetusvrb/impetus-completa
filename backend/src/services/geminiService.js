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
    } catch {
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
    } catch {
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
      context.manuais = r.rows || [];
    } catch {
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
  } catch {
    context.equipe = [];
  }

  if (userId) {
    context.requester_id = userId;
  }
  return context;
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
  } catch {
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
  montarContexto,
  geminiSupervisor
};
