/**
 * Serviço de IA com circuit breaker e timeout
 * Fallback em caso de falha do OpenAI
 * Inclui: classify, processIncomingMessage (scaffold original)
 */
const OpenAI = require('openai');
const documentContext = require('./documentContext');
const incomingProcessor = require('./incomingMessageProcessor');

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Tipos de classificação (arquitetura IMPETUS + Z-API)
const CLASSIFY_TYPES = ['tarefa', 'lembrete', 'comunicado', 'falha_técnica', 'autorização', 'alerta', 'dúvida', 'outro'];

// Circuit Breaker simples: após 5 falhas consecutivas, pausa 60s
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

async function chatCompletion(prompt, opts = {}) {
  if (!client) return `FALLBACK: IA não configurada. Prompt: ${prompt.slice(0, 300)}`;
  if (isCircuitOpen()) return `FALLBACK: Serviço de IA temporariamente indisponível.`;

  try {
    const timeoutMs = opts.timeout || 30000; // 30s
    const completionPromise = client.chat.completions.create({
      model: opts.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: opts.max_tokens || 800
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    );
    const res = await Promise.race([completionPromise, timeoutPromise]);
    failures = 0;
    return res.choices?.[0]?.message?.content || '';
  } catch (err) {
    failures++;
    lastFailureTime = Date.now();
    console.warn('[AI_ERROR]', err.message, 'failures:', failures);
    if (err.message === 'TIMEOUT') {
      return `FALLBACK: Tempo esgotado na análise. Tente novamente.`;
    }
    return `FALLBACK: IA indisponível. Erro: ${err.message?.slice(0, 100)}`;
  }
}

async function embedText(text) {
  if (!client) return null;
  if (isCircuitOpen()) return null;
  try {
    const r = await client.embeddings.create({ model: 'text-embedding-3-small', input: text });
    failures = 0;
    return r.data[0].embedding;
  } catch (err) {
    failures++;
    lastFailureTime = Date.now();
    console.warn('[AI_EMBED_ERROR]', err.message);
    return null;
  }
}

const SAFETY_DISCLAIMER = `

---
⚠️ **AVISO DE SEGURANÇA** – Procedimentos elétricos, com pressão ou fluidos perigosos exigem: bloqueio/etiquetagem (LOTO), EPI adequado, desenergia confirmada e supervisão de técnico qualificado. NUNCA execute sem confirmação humana de que as condições de segurança foram atendidas.
---`;

async function generateDiagnosticReport(text, candidates, docContext = ''){
  const context = (candidates||[]).slice(0,6).map((c,i)=>`[${i+1}] Manual: ${(c.title||'manual')}\n${(c.chunk_text||'').slice(0,600)}`).join('\n---\n');
  const basePrompt = `Você é um assistente técnico industrial.${docContext ? '\n' + docContext : ''}

Mensagem do usuário: "${text}"

Contexto dos manuais (cite SEMPRE a fonte):
${context}

Gere:
1) Possíveis causas (priorizadas) – para cada causa, cite a fonte no formato [Manual: título do manual]
2) Passos de verificação – cite a fonte quando aplicável
3) Checklist de segurança e EPIs necessários
4) Referências – liste explicitamente os manuais utilizados com formato "[Manual: título]"

REGRAS: Cite SEMPRE a fonte ao mencionar informação vinda dos manuais. Evite afirmar algo sem referência. INCLUA aviso explícito para procedimentos elétricos ou com fluidos sob pressão. Conformidade com política Impetus e documentação interna.`;
  const report = await chatCompletion(basePrompt, { max_tokens: 800 });
  const low = (text || '').toLowerCase();
  const needsDisclaimer = /elétr|eletr|tensão|alta volt|pressão|pressuriz|fluido|vapor|óleo hidr|vazamento/i.test(low);
  return needsDisclaimer ? report + SAFETY_DISCLAIMER : report;
}

/**
 * Classifica mensagem operacional (arquitetura IMPETUS + Z-API)
 * Tipos: tarefa, lembrete, comunicado, falha_técnica, autorização, alerta, dúvida, outro
 */
async function classify(text) {
  if (!text || typeof text !== 'string' || text.trim().length < 3) return 'outro';
  if (!client || isCircuitOpen()) return classifyByKeywords(text);

  const prompt = `Classifique a mensagem operacional industrial em EXATAMENTE uma palavra: tarefa, lembrete, comunicado, falha_técnica, autorização, alerta, dúvida, outro.
Mensagem: "${(text || '').slice(0, 500).replace(/"/g, "'")}"
Retorne SOMENTE a palavra (minúscula, sem acento em falha_tecnica se preferir).`;

  try {
    const out = await chatCompletion(prompt, { max_tokens: 16 });
    const kind = (out || '').trim().toLowerCase().replace(/[^a-z_]/g, '');
    return CLASSIFY_TYPES.includes(kind) ? kind : classifyByKeywords(text);
  } catch (err) {
    return classifyByKeywords(text);
  }
}

function classifyByKeywords(text) {
  const low = (text || '').toLowerCase();
  if (/falha|parou|não liga|erro|vaza|queima|ruído|vibra|trava|quebr/i.test(low)) return 'falha_técnica';
  if (/tarefa|fazer|executar|entregar|prazo|até dia/i.test(low)) return 'tarefa';
  if (/lembrar|lembrete|reunião|amanhã|às \d/i.test(low)) return 'lembrete';
  if (/alerta|urgente|atenção|risco|perigo/i.test(low)) return 'alerta';
  if (/autoriz|aprov|ok para|pode fazer/i.test(low)) return 'autorização';
  if (/\?|dúvida|como |o que |por que /i.test(low)) return 'dúvida';
  if (/comunic|inform|aviso|circular/i.test(low)) return 'comunicado';
  return 'outro';
}

/**
 * Busca trechos de manuais relevantes para o texto (scaffold)
 */
async function searchManualsForText(query, companyId = null) {
  return documentContext.searchCompanyManuals(companyId, query, 6);
}

/**
 * Processa mensagem recebida (webhook) - scaffold original + arquitetura IMPETUS
 * Classifica, cria diagnóstico (falha) ou tarefa conforme tipo
 */
async function processIncomingMessage(msg, opts = {}) {
  const { companyId = null } = opts;
  const text = msg.text || msg.body || '';
  const sender = msg.sender || msg.phone || 'Desconhecido';

  const kind = await classify(text);

  if (kind === 'falha_técnica') {
    const candidates = await searchManualsForText(text, companyId);
    const docContext = await documentContext.buildAIContext({ companyId, queryText: text });
    let report = await generateDiagnosticReport(text, candidates, docContext);
    const taskId = await incomingProcessor.createTaskFromMessage({
      companyId,
      title: `Diagnóstico: ${sender}`,
      description: report,
      assignee: null
    });
    return { kind, report, taskId };
  }

  if (kind === 'tarefa') {
    const taskId = await incomingProcessor.createTaskFromMessage({
      companyId,
      title: `Tarefa de ${sender}`,
      description: text,
      assignee: null
    });
    return { kind, taskId };
  }

  return { kind };
}

module.exports = {
  chatCompletion,
  embedText,
  generateDiagnosticReport,
  classify,
  searchManualsForText,
  processIncomingMessage
};
