/**
 * MULTIMODAL CHAT SERVICE
 * Orquestra chat com imagens, arquivos, voz
 * Integra com ai.analyzeImage, ai.chatWithVision, documentTextExtractorService
 */

const fs = require('fs');
const path = require('path');
const ai = require('./ai');
const { IMPETUS_IA_SYSTEM_PROMPT_FULL } = require('./impetusAIGovernancePolicy');
const uploadPolicy = require('../config/uploadPolicy');
const documentTextExtractor = require('./documentTextExtractorService');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/chat-multimodal');
const MAX_FILE_MB = uploadPolicy.MODULE_LIMITS_MB.dashboard_chat;
const MAX_IMAGE_MB = uploadPolicy.MODULE_LIMITS_MB.dashboard_chat_image;

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Processa arquivo enviado e extrai conteúdo para contexto da IA
 * @returns {{ type: 'image'|'document', filePath?, originalName, extractedText?, extractionOk?, extractor?, extractionError? }}
 */
async function processUploadedFile(filePath, originalName, companyId, logCtx = {}) {
  ensureUploadDir();
  const result = await documentTextExtractor.extractFromPath(filePath, originalName, {
    module: logCtx.module || 'dashboard_chat_upload',
    user: logCtx.user
  });

  if (result.mediaType === 'image') {
    return { type: 'image', filePath, originalName, extractionOk: true };
  }

  return {
    type: 'document',
    originalName,
    extractedText: result.ok ? result.text : '',
    extractionOk: result.ok,
    extractor: result.extractor,
    extractionError: result.ok ? undefined : result.error || 'EXTRACTION_FAILED'
  };
}

function buildDocumentSystemBlock(fileContext) {
  if (!fileContext || !documentTextExtractor.isUsableExtractedText(fileContext.extractedText)) {
    return '';
  }
  const name = fileContext.originalName || 'documento';
  const body = String(fileContext.extractedText).slice(0, 12000);
  return [
    '## DOCUMENTO ANEXADO PELO UTILIZADOR',
    `Ficheiro: ${name}`,
    `Extrator: ${fileContext.extractor || 'sistema'}`,
    '',
    'O texto abaixo foi extraído automaticamente pelo IMPETUS. Use-o como fonte primária para responder.',
    'Não diga que não consegue ler documentos anexados — o conteúdo já está disponível neste bloco.',
    '',
    '--- INÍCIO DO TEXTO EXTRAÍDO ---',
    body,
    '--- FIM DO TEXTO EXTRAÍDO ---'
  ].join('\n');
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
    user = null,
    systemPromptExtra = ''
  } = opts;

  if (fileContext && !imageBase64) {
    if (fileContext.extractionOk === false || !documentTextExtractor.isUsableExtractedText(fileContext.extractedText)) {
      return {
        ok: false,
        code: 'EXTRACTION_FAILED',
        error:
          fileContext.extractionError ||
          'Não foi possível extrair conteúdo deste arquivo. Formato não suportado ou arquivo corrompido.',
        reply:
          fileContext.extractionError ||
          'Não foi possível extrair conteúdo deste arquivo. Formato não suportado ou arquivo corrompido.'
      };
    }
  }

  let structuralAppend = '';
  if (user) {
    try {
      const structuralAIGovernance = require('./structuralAIGovernanceService');
      const gov = await structuralAIGovernance.buildAIGovernancePackage(user, {
        channel: 'impetus_ia_multimodal',
        queryText: message,
        companyId
      });
      structuralAppend = gov.system_append || '';
    } catch (e) {
      console.warn('[MULTIMODAL_STRUCTURAL_GOV]', e?.message ?? e);
    }
  }

  const documentBlock = buildDocumentSystemBlock(fileContext);
  if (documentBlock) {
    try {
      console.info(
        '[DOCUMENT_CONTEXT_SENT]',
        JSON.stringify({
          chars: documentBlock.length,
          file: String(fileContext?.originalName || '').slice(0, 120),
          extractor: fileContext?.extractor || null
        })
      );
    } catch (_e) {
      /* noop */
    }
  }

  const messages = [];
  const systemContent = `${IMPETUS_IA_SYSTEM_PROMPT_FULL}

## Multimodal
Você responde como IMPETUS IA (única interface). Não invente dados além do contexto e dos anexos.
${structuralAppend}
${systemPromptExtra}
Responda de forma natural, direta e técnica quando apropriado. Se houver imagem, descreva e analise.
Se houver bloco "DOCUMENTO ANEXADO", responda com base no texto extraído — cite tópicos e dados do documento.
Em português do Brasil.`;

  messages.push({ role: 'system', content: systemContent });

  if (documentBlock) {
    messages.push({ role: 'system', content: documentBlock });
  }

  for (const h of history.slice(-8)) {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content || ''
    });
  }

  const userContentParts = [];
  if (documentBlock) {
    userContentParts.push(
      `[Referência: documento "${fileContext.originalName || 'anexo'}" — conteúdo completo no bloco de sistema acima.]\n\n`
    );
  }
  userContentParts.push(`${userName || 'Utilizador'}: ${(message || '').trim() || 'Analise o conteúdo anexado.'}`);

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

  const raw = await ai.chatWithVision(messages, {
    max_tokens: 1600,
    timeout: 60000,
    billing: companyId && user?.id ? { companyId, userId: user.id } : undefined
  });

  if (raw && typeof raw === 'object' && raw.ok === false) {
    return raw;
  }

  return raw;
}

/**
 * Transcreve áudio (voz) para texto - delegado ao mediaProcessor
 */
async function transcribeVoice(audioFilePath) {
  const mediaProcessor = require('./mediaProcessorService');
  return mediaProcessor.transcribeAudio(audioFilePath, { language: 'pt' });
}

module.exports = {
  processMultimodalChat,
  processUploadedFile,
  buildDocumentSystemBlock,
  transcribeVoice,
  ensureUploadDir,
  UPLOAD_DIR,
  MAX_FILE_MB,
  MAX_IMAGE_MB
};
