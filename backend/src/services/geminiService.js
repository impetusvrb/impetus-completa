/**
 * GEMINI SERVICE - IA Supervisora Multimodal
 * Google Gemini 1.5 Pro para análise de imagens, vídeos, áudio, sensores.
 * Responsável por: supervisão operacional, OCR, análise de máquinas, Cadastrar com IA.
 *
 * Preserva: ai.js (ChatGPT) e claudeService.js (análise de dados) - não substitui.
 */
const fs = require('fs');
const path = require('path');

let client = null;
let modelName = 'gemini-1.5-pro';

function init() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  try {
    const { GoogleGenAI } = require('@google/genai');
    client = new GoogleGenAI({ apiKey: apiKey.trim() });
    modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    return client;
  } catch (err) {
    console.warn('[GEMINI] SDK não disponível:', err.message);
    return null;
  }
}

// Lazy init na primeira chamada
function getClient() {
  if (client !== undefined) return client;
  client = init();
  return client;
}

function isAvailable() {
  return !!getClient();
}

// Circuit breaker
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

/**
 * Analisa imagem com prompt contextual (manutenção, inspeção, OCR)
 * @param {string} imageBase64 - data:image/xxx;base64,... ou base64 puro
 * @param {string} prompt - instrução/pergunta
 * @param {Object} opts - { systemContext }
 */
async function analyzeImage(imageBase64, prompt, opts = {}) {
  if (!getClient() || isCircuitOpen()) return null;

  let mimeType = 'image/jpeg';
  let b64 = imageBase64;
  if (imageBase64?.startsWith('data:')) {
    const match = imageBase64.match(/data:([^;]+);base64,(.+)/);
    if (match) {
      mimeType = match[1];
      b64 = match[2];
    }
  }

  const systemContext = opts.systemContext || 'Você é especialista em análise industrial. Analise imagens de máquinas, painéis, peças, documentos e processos. Descreva o que vê, identifique equipamentos, leia displays e textos (OCR), sugira diagnósticos ou melhorias. Seja objetivo e técnico.';

  const fullPrompt = `${systemContext}\n\n${prompt || 'Analise esta imagem e descreva.'}`;

  try {
    const response = await client.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: b64 } },
            { text: fullPrompt }
          ]
        }
      ],
      config: { maxOutputTokens: 1024 }
    });

    failures = 0;
    const text = typeof response?.text === 'function' ? response.text() : (response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text);
    return (text || '').trim() || null;
  } catch (err) {
    failures++;
    lastFailureTime = Date.now();
    console.warn('[GEMINI] analyzeImage:', err.message?.slice(0, 150));
    return null;
  }
}

/**
 * Analisa conteúdo multimodal (imagem + texto, ou só texto)
 * Útil para Cadastrar com IA e validação cruzada
 */
async function analyzeMultimodal(parts, opts = {}) {
  if (!getClient() || isCircuitOpen()) return null;

  const configParts = Array.isArray(parts) ? parts : [{ text: String(parts) }];

  try {
    const response = await client.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: configParts }],
      config: { maxOutputTokens: opts.max_tokens || 2048 }
    });

    failures = 0;
    const text = typeof response?.text === 'function' ? response.text() : (response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text);
    return (text || '').trim() || null;
  } catch (err) {
    failures++;
    lastFailureTime = Date.now();
    console.warn('[GEMINI] analyzeMultimodal:', err.message?.slice(0, 150));
    return null;
  }
}

/**
 * Extrai dados estruturados de imagem/documento para Cadastrar com IA
 * @param {string} imageBase64 - imagem em base64
 * @param {string} userDescription - descrição opcional do usuário
 * @returns {Promise<Object|null>} { category, extracted_data, summary }
 */
async function extractStructuredFromImage(imageBase64, userDescription = '') {
  const prompt = `Analise esta imagem e extraia dados estruturados para um sistema de gestão industrial.
${userDescription ? `Contexto do usuário: ${userDescription}` : ''}

Retorne APENAS um JSON válido (sem markdown):
{
  "category": "equipamento|custo|processo|material|fornecedor|documentacao|outro",
  "extracted_data": { "campo": "valor", ... },
  "summary": "resumo em uma linha"
}

Se não conseguir extrair, retorne category: "outro" e extracted_data: {}.`;

  const raw = await analyzeImage(imageBase64, prompt);
  if (!raw) return null;

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return { category: 'outro', extracted_data: {}, summary: raw?.slice(0, 200) || '' };
  }
}

/**
 * Interpreta texto + áudio transcrito para Cadastrar com IA
 */
async function interpretForRegistration(text, opts = {}) {
  if (!text || typeof text !== 'string') return null;
  return analyzeMultimodal([{ text }], opts);
}

/**
 * Analisa dados de sensores IoT (vibração, energia, status de máquinas)
 */
async function analyzeSensorData(sensorData, context = {}) {
  if (!getClient() || isCircuitOpen()) return null;
  const dataStr = typeof sensorData === 'object' ? JSON.stringify(sensorData) : String(sensorData);
  const prompt = `Como supervisor multimodal industrial, analise estes dados de sensores.

Dados: ${dataStr.slice(0, 8000)}

Contexto: ${JSON.stringify(context)}

Retorne SOMENTE um JSON válido:
{
  "evento_detectado": "string",
  "nivel_risco": "baixo|médio|alto|crítico",
  "equipamento": "string ou null",
  "descricao": "string",
  "recomendacao": "string"
}`;

  try {
    const raw = await analyzeMultimodal([{ text: prompt }], { max_tokens: 1024 });
    const m = (raw || '').match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch (err) {
    console.warn('[GEMINI] analyzeSensorData:', err.message);
    return null;
  }
}

module.exports = {
  analyzeImage,
  analyzeMultimodal,
  extractStructuredFromImage,
  interpretForRegistration,
  analyzeSensorData,
  isAvailable,
  getClient
};
