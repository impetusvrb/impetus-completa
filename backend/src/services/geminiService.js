/**
 * IMPETUS - Gemini IA Supervisora Multimodal
 * Analisa imagens, vídeos, áudio, sensores e dados físicos da operação
 * Modelo: Gemini 1.5 Pro
 * Usa REST API (sem dependência de SDK) para máxima compatibilidade
 */
const path = require('path');
const fs = require('fs').promises;
const https = require('https');

const apiKey = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

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
  return !!apiKey && !isCircuitOpen();
}

/**
 * Chama Gemini via REST API
 */
async function callGeminiRest(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(options, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(buf);
          const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          resolve(text.trim());
        } catch (e) {
          reject(new Error(buf.slice(0, 200) || 'Parse error'));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Analisa imagem industrial (painéis, máquinas, inspeção)
 */
async function analyzeImage(imageInput, prompt, opts = {}) {
  if (!apiKey) {
    console.warn('[GEMINI] API não configurada (GEMINI_API_KEY)');
    return null;
  }
  if (isCircuitOpen()) return null;

  try {
    let b64 = '';
    let mimeType = 'image/jpeg';
    if (typeof imageInput === 'string') {
      if (imageInput.startsWith('data:')) {
        const m = imageInput.match(/data:([^;]+);base64,(.+)/);
        if (m) { mimeType = m[1]; b64 = m[2]; } else b64 = imageInput.replace(/^[^,]+/, '');
      } else b64 = imageInput;
    } else if (Buffer.isBuffer(imageInput)) {
      b64 = imageInput.toString('base64');
    }
    if (!b64) return null;

    const systemPrompt = opts.systemPrompt || `Você é o supervisor multimodal do Impetus. Analise imagens industriais: máquinas, painéis, displays, equipamentos. Identifique falhas visuais, comportamento anormal, riscos de segurança, paradas de produção. Seja objetivo e técnico.`;
    const fullPrompt = `${systemPrompt}\n\n${prompt || 'Analise esta imagem e descreva o que observa.'}`;

    const body = {
      contents: [{ parts: [{ inlineData: { mimeType, data: b64 } }, { text: fullPrompt }] }],
      generationConfig: { maxOutputTokens: opts.max_tokens || 2048, temperature: 0.2 }
    };

    const text = await callGeminiRest(body);
    failures = 0;
    return text || null;
  } catch (err) {
    failures++;
    lastFailureTime = Date.now();
    console.warn('[GEMINI] analyzeImage:', err.message);
    return null;
  }
}

/**
 * Analisa múltiplas mídias (imagem + texto)
 */
async function analyzeMultimodal(parts, opts = {}) {
  if (!apiKey) return null;
  if (isCircuitOpen()) return null;

  try {
    const geminiParts = [];
    for (const p of parts) {
      if (p.type === 'text') geminiParts.push({ text: p.text });
      else if (p.type === 'image' && p.base64) {
        const data = p.base64.replace(/^data:[^;]+;base64,/, '');
        geminiParts.push({ inlineData: { mimeType: p.mimeType || 'image/jpeg', data } });
      }
    }

    const body = {
      contents: [{ parts: geminiParts }],
      generationConfig: { maxOutputTokens: opts.max_tokens || 2048, temperature: 0.2 }
    };

    const text = await callGeminiRest(body);
    failures = 0;
    return text || null;
  } catch (err) {
    failures++;
    lastFailureTime = Date.now();
    console.warn('[GEMINI] analyzeMultimodal:', err.message);
    return null;
  }
}

/**
 * Supervisão de sensores - interpreta dados de IoT/sensores
 */
async function analyzeSensorData(sensorData, context = {}) {
  if (!apiKey) return null;
  if (isCircuitOpen()) return null;

  const dataStr = typeof sensorData === 'object' ? JSON.stringify(sensorData) : String(sensorData);
  const prompt = `Como supervisor multimodal industrial, analise estes dados de sensores.

Dados: ${dataStr.slice(0, 8000)}

Contexto: ${JSON.stringify(context)}

Retorne JSON:
{
  "evento_detectado": "string",
  "nivel_risco": "baixo|médio|alto|crítico",
  "equipamento": "string ou null",
  "descricao": "string",
  "recomendacao": "string"
}

Retorne SOMENTE o JSON válido.`;

  try {
    const text = await callGeminiRest({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.1 }
    });
    failures = 0;
    const m = (text || '').match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch (err) {
    failures++;
    lastFailureTime = Date.now();
    console.warn('[GEMINI] analyzeSensorData:', err.message);
    return null;
  }
}

/**
 * Interpreta arquivo (imagem) para cadastro operacional
 */
async function interpretFileForCadastro(filePath, opts = {}) {
  if (!apiKey || !filePath) return null;
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > 20 * 1024 * 1024) return null;
    const ext = path.extname(filePath).toLowerCase();
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    if (!imageExts.includes(ext)) return null;

    const buf = await fs.readFile(filePath);
    const base64 = buf.toString('base64');
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

    const prompt = opts.prompt || `Extraia informações estruturadas desta imagem para cadastro operacional.
Identifique: equipamentos, máquinas, processos, custos, materiais, fornecedores, números de painéis, leituras.
Retorne SOMENTE um JSON válido: { "tipo": "equipamento|processo|custo|documento|outro", "itens": [...], "observacoes": "string" }`;

    const text = await analyzeMultimodal(
      [{ type: 'image', base64, mimeType }, { type: 'text', text: prompt }],
      { max_tokens: 2048 }
    );
    if (!text) return null;
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { tipo: 'outro', itens: [], observacoes: text };
  } catch (err) {
    console.warn('[GEMINI] interpretFileForCadastro:', err.message);
    return null;
  }
}

module.exports = {
  analyzeImage,
  analyzeMultimodal,
  analyzeSensorData,
  interpretFileForCadastro,
  isAvailable,
  isCircuitOpen
};
