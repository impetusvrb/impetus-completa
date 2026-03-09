/**
 * MEDIA PROCESSOR SERVICE
 * Transcrição de áudio e interpretação de mídia para enriquecer relatórios
 * Usa OpenAI Whisper para áudio; fallback para texto quando indisponível
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai').default;

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const SUPPORTED_AUDIO = ['.mp3', '.m4a', '.wav', '.ogg', '.oga', '.webm', '.mp4', '.mpeg'];
const MAX_AUDIO_MB = 25;

/**
 * Transcreve arquivo de áudio ou vídeo (extrai faixa de áudio) usando Whisper
 * @param {string} filePath - Caminho local do arquivo
 * @param {Object} opts - { language?: 'pt' }
 * @returns {Promise<{ text: string, success: boolean }>}
 */
async function transcribeAudio(filePath, opts = {}) {
  if (!client) return { text: '', success: false, error: 'OpenAI não configurada' };
  if (!filePath || !fs.existsSync(filePath)) return { text: '', success: false, error: 'Arquivo não encontrado' };

  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_AUDIO.includes(ext)) {
    return { text: '', success: false, error: `Formato não suportado: ${ext}` };
  }

  const stat = fs.statSync(filePath);
  if (stat.size > MAX_AUDIO_MB * 1024 * 1024) {
    return { text: '', success: false, error: `Arquivo muito grande (máx ${MAX_AUDIO_MB}MB)` };
  }

  try {
    const fileStream = fs.createReadStream(filePath);
    const response = await client.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language: opts.language || 'pt',
      response_format: 'text'
    });

    const text = typeof response === 'string' ? response : (response?.text || '');
    return { text: text.trim(), success: true };
  } catch (err) {
    console.warn('[MEDIA_PROCESSOR] transcribeAudio:', err.message);
    return { text: '', success: false, error: err.message };
  }
}

/**
 * Interpreta transcrição ou texto com IA para extrair dados estruturados (melhoria de relatórios)
 * @param {string} text - Texto (transcrito ou original)
 * @param {Object} opts - { type?: 'operational' }
 * @returns {Promise<Object>}
 */
async function interpretTextForReports(text, opts = {}) {
  if (!text || typeof text !== 'string' || text.trim().length < 2) {
    return { type: 'outro', priority: 3, keywords: [] };
  }

  const ai = require('./ai');
  if (!ai.chatCompletion) return { type: 'outro', priority: 3, keywords: [] };

  try {
    const prompt = `Analise esta comunicação operacional industrial e retorne JSON:
{
  "type": "falha_técnica|tarefa|lembrete|comunicado|alerta|dúvida|outro",
  "priority": 1-5,
  "keywords": ["palavra1", "palavra2"],
  "summary": "resumo em uma linha"
}

Texto: "${(text || '').slice(0, 1000).replace(/"/g, "'")}"

Retorne SOMENTE o JSON, sem markdown.`;
    const out = await ai.chatCompletion(prompt, { max_tokens: 150 });
    const match = (out || '').match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (err) {
    console.warn('[MEDIA_PROCESSOR] interpretTextForReports:', err.message);
  }
  return { type: 'outro', priority: 3, keywords: [] };
}

module.exports = {
  transcribeAudio,
  interpretTextForReports,
  SUPPORTED_AUDIO
};
