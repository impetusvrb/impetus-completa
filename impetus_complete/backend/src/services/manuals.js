const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const ai = require('./ai');
const db = require('../db');

const OCR_ENABLED = process.env.OCR_ENABLED === 'true' || process.env.OCR_ENABLED === '1';

/**
 * Extrai texto de PDF via OCR (fallback para PDFs escaneados)
 * Requer: npm install tesseract.js pdf2pic
 * Requer: GraphicsMagick ou ImageMagick (para pdf2pic)
 * Ativar: OCR_ENABLED=true no .env
 */
async function extractTextViaOCR(filePath) {
  if (!OCR_ENABLED) return '';
  const ext = (path.extname(filePath) || '').toLowerCase();
  if (ext !== '.pdf') return '';
  try {
    const { fromPath } = require('pdf2pic');
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, '.pdf');
    const options = { density: 150, saveFilename: base + '_page', savePath: dir, format: 'png' };
    const convert = fromPath(filePath, options);
    const pages = await convert.bulk(-1, { responseType: 'image' });
    if (!pages || pages.length === 0) return '';

    const Tesseract = require('tesseract.js');
    const worker = await Tesseract.createWorker('por+eng', 1, { logger: () => {} });
    const texts = [];
    for (let i = 0; i < pages.length; i++) {
      const imgPath = pages[i].path || pages[i];
      if (imgPath && fs.existsSync(imgPath)) {
        const { data: { text } } = await worker.recognize(imgPath);
        if (text && text.trim()) texts.push(text.trim());
        try { fs.unlinkSync(imgPath); } catch (_) {}
      }
    }
    await worker.terminate();
    return texts.join('\n\n');
  } catch (err) {
    console.warn('[MANUALS] OCR fallback failed:', err.message);
    return '';
  }
}

async function extractTextFromFile(filePath) {
  const data = fs.readFileSync(filePath);
  try {
    const parsed = await pdfParse(data);
    if (parsed && parsed.text && parsed.text.trim().length > 20) return parsed.text;
  } catch (e) {
    console.warn('[MANUALS] pdf-parse failed:', e.message);
  }
  return await extractTextViaOCR(filePath);
}

async function chunkAndEmbedManual(manualId, text){
  if(!text || text.length<20) return;
  const sentences = text.split(/(?<=\.|\?|!)\s+/);
  const chunks=[]; let cur='';
  for(const s of sentences){
    if((cur + ' ' + s).length > 1500){ chunks.push(cur.trim()); cur = s; } else { cur += ' ' + s; }
  }
  if(cur.trim()) chunks.push(cur.trim());
  for(const chunk of chunks){
    let emb = null;
    try{ emb = await ai.embedText(chunk); }catch(e){ emb = null; }
    if (emb) {
      await db.query('INSERT INTO manual_chunks(manual_id, chunk_text, embedding) VALUES($1,$2,$3)', [manualId, chunk, emb]);
    }
  }
}

module.exports = { extractTextFromFile, chunkAndEmbedManual };
