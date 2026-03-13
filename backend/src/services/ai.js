/**
 * IMPETUS - Serviço de IA Unificado
 * ChatGPT (OpenAI): conversação, interface com usuários
 * Circuit breaker, timeout e fallback em caso de falha
 */
const OpenAI = require('openai');
const documentContext = require('./documentContext');
let incomingProcessor;
try { incomingProcessor = require('./incomingMessageProcessor'); } catch (_) {}

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const CLASSIFY_TYPES = ['tarefa', 'lembrete', 'comunicado', 'falha_técnica', 'autorização', 'alerta', 'dúvida', 'outro'];

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
  if (!client) return `FALLBACK: IA não configurada. Prompt: ${(prompt || '').slice(0, 300)}`;
  if (isCircuitOpen()) return `FALLBACK: Serviço de IA temporariamente indisponível.`;

  try {
    const timeoutMs = opts.timeout || 30000;
    const completionPromise = client.chat.completions.create({
      model: opts.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: Array.isArray(opts.messages) ? opts.messages : [{ role: 'user', content: String(prompt) }],
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
    if (err.message === 'TIMEOUT') return `FALLBACK: Tempo esgotado na análise. Tente novamente.`;
    return `FALLBACK: IA indisponível. Erro: ${(err.message || '').slice(0, 100)}`;
  }
}

async function embedText(text) {
  if (!client) return null;
  if (isCircuitOpen()) return null;
  try {
    const r = await client.embeddings.create({ model: 'text-embedding-3-small', input: text });
    failures = 0;
    return r.data?.[0]?.embedding || null;
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

async function generateDiagnosticReport(text, candidates, docContext = '') {
  const context = (candidates || []).slice(0, 6).map((c, i) => `[${i + 1}] Manual: ${(c.title || 'manual')}\n${(c.chunk_text || '').slice(0, 600)}`).join('\n---\n');
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

async function classify(text) {
  if (!text || typeof text !== 'string' || text.trim().length < 3) return 'outro';
  if (!client || isCircuitOpen()) return classifyByKeywords(text);
  const prompt = `Classifique a mensagem operacional industrial em EXATAMENTE uma palavra: tarefa, lembrete, comunicado, falha_técnica, autorização, alerta, dúvida, outro.
Mensagem: "${(text || '').slice(0, 500).replace(/"/g, "'")}"
Retorne SOMENTE a palavra (minúscula).`;
  try {
    const out = await chatCompletion(prompt, { max_tokens: 16 });
    const kind = (out || '').trim().toLowerCase().replace(/[^a-z_]/g, '');
    return CLASSIFY_TYPES.includes(kind) ? kind : classifyByKeywords(text);
  } catch {
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

async function searchManualsForText(query, companyId = null) {
  return documentContext?.searchCompanyManuals?.(companyId, query, 6) || [];
}

async function processIncomingMessage(msg, opts = {}) {
  if (!incomingProcessor) return { kind: await classify(msg.text || msg.body || '') };
  const { companyId = null } = opts;
  const text = msg.text || msg.body || '';
  const sender = msg.sender || msg.phone || 'Desconhecido';
  const kind = await classify(text);
  if (kind === 'falha_técnica') {
    const candidates = await searchManualsForText(text, companyId);
    const docContext = await documentContext?.buildAIContext?.({ companyId, queryText: text }) || '';
    let report = await generateDiagnosticReport(text, candidates, docContext);
    const taskId = await incomingProcessor.createTaskFromMessage({ companyId, title: `Diagnóstico: ${sender}`, description: report, assignee: null });
    return { kind, report, taskId };
  }
  if (kind === 'tarefa') {
    const taskId = await incomingProcessor.createTaskFromMessage({ companyId, title: `Tarefa de ${sender}`, description: text, assignee: null });
    return { kind, taskId };
  }
  return { kind };
}

async function chatWithVision(messages, opts = {}) {
  if (!client) return `FALLBACK: IA não configurada.`;
  if (isCircuitOpen()) return `FALLBACK: Serviço de IA temporariamente indisponível.`;
  const modelVision = opts.model || 'gpt-4o';
  try {
    const timeoutMs = opts.timeout || 45000;
    const completionPromise = client.chat.completions.create({
      model: modelVision,
      messages,
      max_tokens: opts.max_tokens || 1024
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs));
    const res = await Promise.race([completionPromise, timeoutPromise]);
    failures = 0;
    return res.choices?.[0]?.message?.content || '';
  } catch (err) {
    failures++;
    lastFailureTime = Date.now();
    console.warn('[AI_VISION_ERROR]', err.message);
    return `FALLBACK: Não foi possível analisar a imagem. Tente novamente.`;
  }
}

async function analyzeImage(imageBase64, userPrompt, opts = {}) {
  let url = imageBase64;
  if (url && !url.startsWith('data:')) url = `data:image/jpeg;base64,${url}`;
  const systemContext = opts.systemContext || 'Você é o Impetus, assistente técnico industrial. Analise imagens de máquinas, peças, painéis elétricos e manuais. Descreva o que vê, sugira diagnósticos quando aplicável e oriente sobre manutenção. Seja objetivo e técnico.';
  const content = [
    { type: 'text', text: `${systemContext}\n\nPergunta/contexto do usuário: ${userPrompt || 'Analise esta imagem e descreva.'}` },
    { type: 'image_url', image_url: { url } }
  ];
  return chatWithVision([{ role: 'user', content }], { max_tokens: 1024, timeout: 60000 });
}

module.exports = {
  chatCompletion,
  chatWithVision,
  analyzeImage,
  embedText,
  generateDiagnosticReport,
  classify,
  searchManualsForText,
  processIncomingMessage,
  isCircuitOpen,
  isAvailable: () => !!client && !isCircuitOpen()
};
