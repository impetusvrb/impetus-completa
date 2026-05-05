/**
 * MULTIMODAL CHAT SERVICE
 * Orquestra chat com imagens, arquivos, voz
 * Integra com ai.analyzeImage, ai.chatWithVision, documentContext
 */

const fs = require('fs');
const path = require('path');
const ai = require('./ai');
const documentContext = require('./documentContext');
const mediaProcessor = require('./mediaProcessorService');
const { IMPETUS_IA_SYSTEM_PROMPT_FULL } = require('./impetusAIGovernancePolicy');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/chat-multimodal');
const MAX_FILE_MB = 15;
const MAX_IMAGE_MB = 5;
const ALLOWED_EXT = {
  pdf: ['.pdf'],
  doc: ['.doc', '.docx'],
  xls: ['.xls', '.xlsx'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp']
};

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Extrai texto de PDF
 */
async function extractPdfText(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return (data.text || '').slice(0, 15000);
  } catch (err) {
    console.warn('[MULTIMODAL] extractPdfText:', err.message);
    return null;
  }
}

/**
 * Extrai texto de DOC/DOCX (mammoth - opcional, instalar: npm i mammoth)
 */
async function extractDocText(filePath) {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return (result.value || '').slice(0, 15000);
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') console.warn('[MULTIMODAL] extractDocText:', err.message);
    return null;
  }
}

/**
 * Processa arquivo enviado e extrai conteúdo para contexto da IA
 */
async function processUploadedFile(filePath, originalName, companyId) {
  ensureUploadDir();
  const ext = path.extname(originalName || '').toLowerCase();
  let text = null;
  const type = 'document';

  if (ALLOWED_EXT.pdf.includes(ext)) {
    text = await extractPdfText(filePath);
  } else if (ALLOWED_EXT.doc.includes(ext)) {
    text = await extractDocText(filePath);
  } else if (ALLOWED_EXT.image.includes(ext)) {
    return { type: 'image', filePath, originalName };
  }
  // xls - implementação futura com xlsx parse

  if (text && text.trim().length > 50) {
    return { type: 'document', extractedText: text, originalName };
  }
  return { type: 'document', extractedText: '(Não foi possível extrair texto do arquivo)', originalName };
}

/**
 * Processa mensagem multimodal: texto + imagem opcional + contexto de arquivo
 */
async function processMultimodalChat(opts) {
  const {
    message,
    history = [],
    imageBase64,
    fileContext,
    companyId,
    userName,
    systemPromptExtra = ''
  } = opts;

  const messages = [];
  const systemContent = `${IMPETUS_IA_SYSTEM_PROMPT_FULL}

## Multimodal
Você responde como IMPETUS IA (única interface). Não invente dados além do contexto e dos anexos.
${systemPromptExtra}
Responda de forma natural, direta e técnica quando apropriado. Se houver imagem, descreva e analise. Se houver documento anexo, use o contexto. Em português do Brasil.`;

  messages.push({ role: 'system', content: systemContent });

  for (const h of history.slice(-8)) {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content || ''
    });
  }

  const userContentParts = [];
  if (fileContext?.extractedText) {
    userContentParts.push(`[Documento anexado: ${fileContext.originalName || 'arquivo'}]\n${fileContext.extractedText.slice(0, 12000)}\n\n---\n`);
  }
  userContentParts.push(`${userName || 'Usuário'}: ${(message || '').trim() || 'Analise o conteúdo anexado.'}`);

  if (imageBase64) {
    let url = imageBase64;
    if (!url.startsWith('data:')) url = `data:image/jpeg;base64,${url}`;
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userContentParts.join('') },
        { type: 'image_url', image_url: { url } }
      ]
    });
  } else {
    messages.push({
      role: 'user',
      content: userContentParts.join('')
    });
  }

  return ai.chatWithVision(messages, { max_tokens: 1024, timeout: 60000 });
}

/**
 * Transcreve áudio (voz) para texto - delegado ao mediaProcessor
 */
async function transcribeVoice(audioFilePath) {
  return mediaProcessor.transcribeAudio(audioFilePath, { language: 'pt' });
}

module.exports = {
  processMultimodalChat,
  processUploadedFile,
  transcribeVoice,
  ensureUploadDir,
  UPLOAD_DIR,
  MAX_FILE_MB,
  MAX_IMAGE_MB,
  ALLOWED_EXT
};
