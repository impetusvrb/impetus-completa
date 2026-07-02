'use strict';

/**
 * Extração unificada de texto para chat, registro inteligente e runtime documental.
 * Fonte única — sem pipeline paralelo.
 */

const fs = require('fs');
const path = require('path');
const uploadObservability = require('./uploadObservabilityService');

const MAX_CHARS = parseInt(process.env.IMPETUS_DOCUMENT_EXTRACT_MAX_CHARS || '15000', 10);

const FAIL_PLACEHOLDER_RE =
  /^\(Não foi possível extrair|^\[Documento .*extração de texto limitada|^\[Áudio anexado/i;

function isUsableExtractedText(text) {
  const t = String(text || '').trim();
  if (t.length < 12) return false;
  if (FAIL_PLACEHOLDER_RE.test(t)) return false;
  return true;
}

async function extractPdfText(filePath) {
  const pdfParse = require('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return (data.text || '').trim();
}

async function extractDocxText(filePath) {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return (result.value || '').trim();
}

async function extractXlsxText(filePath) {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const parts = [];
  for (const sheetName of wb.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { blankrows: false });
    const trimmed = String(csv || '').trim();
    if (trimmed) parts.push(`### Planilha: ${sheetName}\n${trimmed}`);
  }
  return parts.join('\n\n').trim();
}

/**
 * PPTX — slides (a:t) + notas do apresentador quando existirem.
 */
async function extractPptxText(filePath) {
  const JSZip = require('jszip');
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const slideKeys = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/i)?.[1] || '0', 10);
      const nb = parseInt(b.match(/slide(\d+)/i)?.[1] || '0', 10);
      return na - nb;
    });

  const blocks = [];
  let slideNum = 0;
  for (const key of slideKeys) {
    slideNum += 1;
    const xml = await zip.file(key).async('string');
    const texts = [];
    const re = /<a:t(?:[^>]*)>([^<]*)<\/a:t>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const t = String(m[1] || '').trim();
      if (t) texts.push(t);
    }
    if (texts.length) {
      blocks.push(`## Slide ${slideNum}\n${texts.join(' ')}`);
    }
  }

  const noteKeys = Object.keys(zip.files).filter((n) => /notesSlides\/notesSlide\d+\.xml$/i.test(n));
  for (const key of noteKeys) {
    const xml = await zip.file(key).async('string');
    const texts = [];
    const re = /<a:t(?:[^>]*)>([^<]*)<\/a:t>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const t = String(m[1] || '').trim();
      if (t) texts.push(t);
    }
    if (texts.length) {
      blocks.push(`## Notas\n${texts.join(' ')}`);
    }
  }

  return blocks.join('\n\n').trim();
}

async function extractPlainText(filePath) {
  return fs.readFileSync(filePath, 'utf8').trim();
}

/**
 * @param {string} filePath
 * @param {string} [originalName]
 * @param {{ module?: string, user?: object }} [logCtx]
 * @returns {Promise<{ ok: boolean, text: string, extractor: string, ext: string, chars: number, error?: string }>}
 */
async function extractFromPath(filePath, originalName = '', logCtx = {}) {
  const ext = path.extname(originalName || filePath || '').toLowerCase();
  const moduleName = logCtx.module || 'document_extractor';

  try {
    uploadObservability.logUploadStart({
      module: moduleName,
      user: logCtx.user,
      file: { originalname: originalName, size: fs.statSync(filePath).size, mimetype: null },
      extra: { phase: 'TEXT_EXTRACT', ext }
    });
  } catch (_e) {
    /* noop */
  }

  let text = '';
  let extractor = 'unknown';

  try {
    if (ext === '.pdf') {
      extractor = 'pdf-parse';
      text = await extractPdfText(filePath);
    } else if (ext === '.docx') {
      extractor = 'mammoth';
      text = await extractDocxText(filePath);
    } else if (ext === '.doc') {
      extractor = 'mammoth';
      try {
        text = await extractDocxText(filePath);
      } catch {
        text = '';
      }
    } else if (ext === '.xlsx' || ext === '.xls') {
      extractor = 'xlsx';
      text = await extractXlsxText(filePath);
    } else if (ext === '.pptx') {
      extractor = 'pptx-jszip';
      text = await extractPptxText(filePath);
    } else if (ext === '.ppt') {
      extractor = 'unsupported';
      return {
        ok: false,
        text: '',
        extractor,
        ext,
        chars: 0,
        error: 'Formato .ppt legado não suportado. Exporte como .pptx.'
      };
    } else if (['.txt', '.csv', '.md'].includes(ext)) {
      extractor = 'utf8';
      text = await extractPlainText(filePath);
    } else if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic', '.heif'].includes(ext)) {
      return { ok: true, text: '', extractor: 'image', ext, chars: 0, mediaType: 'image' };
    } else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm'].includes(ext)) {
      const mediaProcessor = require('./mediaProcessorService');
      const tr = await mediaProcessor.transcribeAudio(filePath, { language: 'pt' });
      text = String(tr?.text || '').trim();
      extractor = 'whisper';
    } else {
      return {
        ok: false,
        text: '',
        extractor: 'unsupported',
        ext,
        chars: 0,
        error: `Formato não suportado para extração: ${ext || 'desconhecido'}`
      };
    }

    const clipped = String(text || '').trim().slice(0, MAX_CHARS);
    const ok = clipped.length >= 12;

    try {
      console.info(
        '[TEXT_EXTRACTED]',
        JSON.stringify({
          module: moduleName,
          ext,
          extractor,
          chars: clipped.length,
          ok,
          file: String(originalName || '').slice(0, 120)
        })
      );
    } catch (_e) {
      /* noop */
    }

    if (ok) {
      uploadObservability.logUploadSuccess({
        module: moduleName,
        user: logCtx.user,
        extra: { phase: 'TEXT_EXTRACT', ext, extractor, chars: clipped.length }
      });
    } else {
      uploadObservability.logUploadFailure({
        module: moduleName,
        user: logCtx.user,
        code: 'EXTRACTION_EMPTY',
        message: 'Texto extraído vazio ou insuficiente',
        extra: { ext, extractor }
      });
    }

    return {
      ok,
      text: clipped,
      extractor,
      ext,
      chars: clipped.length,
      ...(ok ? {} : { error: 'Não foi possível extrair conteúdo legível deste arquivo.' })
    };
  } catch (err) {
    uploadObservability.logUploadFailure({
      module: moduleName,
      user: logCtx.user,
      code: 'EXTRACTION_ERROR',
      message: err?.message
    });
    console.warn('[DOCUMENT_TEXT_EXTRACTOR]', ext, err?.message || err);
    return {
      ok: false,
      text: '',
      extractor,
      ext,
      chars: 0,
      error: err?.message || 'Falha na extração do documento.'
    };
  }
}

module.exports = {
  extractFromPath,
  isUsableExtractedText,
  MAX_CHARS
};
