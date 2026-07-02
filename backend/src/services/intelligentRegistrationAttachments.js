/**
 * Processamento de anexos do Registro Inteligente (foto, documento, áudio).
 */
const path = require('path');
const fs = require('fs');
const geminiService = require('./geminiService');
const mediaProcessor = require('./mediaProcessorService');
const ai = require('./ai');
const documentTextExtractor = require('./documentTextExtractorService');

const ALLOWED_EXT = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.pptx',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.mp3',
  '.m4a',
  '.wav',
  '.webm',
  '.txt',
  '.csv'
];

function mimeFromExt(ext) {
  if (['.png'].includes(ext)) return 'image/png';
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

/**
 * @returns {{ text: string, meta: object }}
 */
async function processUploadedFile(file, userText = '', ctx = {}) {
  const { companyId, userId, userName } = ctx;
  const ext = (path.extname(file.originalname || '') || '').toLowerCase();
  const publicUrl = `/uploads/registro-inteligente/${file.filename}`;
  const baseMeta = {
    type: 'arquivo',
    filename: file.originalname || file.filename,
    url: publicUrl,
    mime: file.mimetype || mimeFromExt(ext)
  };

  let enrichedText = String(userText || '').trim();
  let meta = { ...baseMeta };

  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    meta.type = 'foto';
    const buf = fs.readFileSync(file.path);
    const b64 = buf.toString('base64');
    const mime = mimeFromExt(ext);
    let imageSummary = '';

    if (geminiService.isAvailable()) {
      const result = await geminiService.extractStructuredFromImage(
        `data:${mime};base64,${b64}`,
        userText || 'Descreva o que aparece nesta imagem no contexto operacional industrial.'
      );
      imageSummary = result?.summary || '';
      if (result?.extracted_data && Object.keys(result.extracted_data).length) {
        meta.extracted_data = result.extracted_data;
      }
    }

    const photoBlock = [
      '[Anexo: foto operacional]',
      imageSummary ? `Descrição da imagem: ${imageSummary}` : 'Imagem anexada ao registro.',
      enrichedText ? `Comentário do operador: ${enrichedText}` : null
    ]
      .filter(Boolean)
      .join('\n');

    enrichedText = photoBlock;
    return { text: enrichedText, meta };
  }

  if (['.mp3', '.m4a', '.wav', '.webm'].includes(ext)) {
    meta.type = 'audio';
    const trans = await mediaProcessor.transcribeAudio(file.path, { language: 'pt' });
    const transcription = (trans.text || '').trim() || '(transcrição não disponível)';
    meta.transcription = transcription;

    if (transcription && companyId) {
      try {
        const audioLogs = require('./audioLogsService');
        await audioLogs.persist({
          companyId,
          source: 'registro_inteligente',
          userId,
          senderName: userName,
          mediaUrl: publicUrl,
          transcription,
          messageType: 'audio'
        });
      } catch (e) {
        console.warn('[intelligentRegistrationAttachments] audioLogs:', e?.message);
      }
    }

    enrichedText = [
      '[Anexo: áudio transcrito]',
      transcription,
      enrichedText ? `Comentário adicional: ${enrichedText}` : null
    ]
      .filter(Boolean)
      .join('\n');

    return { text: enrichedText, meta };
  }

  if (['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.pptx', '.txt', '.csv'].includes(ext)) {
    meta.type = 'documento';
    const extraction = await documentTextExtractor.extractFromPath(file.path, file.originalname || '', {
      module: 'registro_inteligente',
      user: { id: userId, company_id: companyId }
    });

    if (!extraction.ok) {
      throw new Error(
        extraction.error ||
          'Não foi possível extrair conteúdo deste arquivo. Formato não suportado ou arquivo corrompido.'
      );
    }

    const docText = extraction.text;

    if (docText && ai.chatCompletion) {
      try {
        const interpreted = await ai.chatCompletion(
          `Resuma em 2-3 frases o conteúdo deste documento para um registro operacional industrial. Texto: ${docText.slice(0, 4000)}`,
          { max_tokens: 200 }
        );
        if (interpreted) meta.document_summary = String(interpreted).trim().slice(0, 600);
      } catch (e) {
        console.warn('[intelligentRegistrationAttachments] doc summary:', e?.message);
      }
    }

    meta.extractor = extraction.extractor;
    meta.extraction_chars = extraction.chars;

    enrichedText = [
      '[Anexo: documento]',
      meta.document_summary ? `Resumo: ${meta.document_summary}` : null,
      `Conteúdo extraído: ${docText.slice(0, 2500)}`,
      enrichedText ? `Comentário do operador: ${enrichedText}` : null
    ]
      .filter(Boolean)
      .join('\n');

    return { text: enrichedText, meta };
  }

  throw new Error(
    'Tipo de arquivo não suportado. Use foto (PNG/JPG), documento (PDF/DOC/DOCX/XLSX/PPTX/TXT) ou áudio (MP3/M4A/WAV).'
  );
}

module.exports = {
  ALLOWED_EXT,
  processUploadedFile
};
