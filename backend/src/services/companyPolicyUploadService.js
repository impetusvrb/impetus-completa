/**
 * Extração de texto de documentos para política da empresa.
 */
const fs = require('fs');
const path = require('path');
const manualsService = require('./manuals');

async function extractPolicyTextFromFile(filePath) {
  const ext = (path.extname(filePath) || '').toLowerCase();

  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8').trim();
  }

  if (ext === '.pdf') {
    const text = await manualsService.extractTextFromFile(filePath);
    return (text || '').trim();
  }

  if (['.doc', '.docx'].includes(ext)) {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return (result.value || '').trim();
    } catch (err) {
      console.warn('[companyPolicyUpload] mammoth failed:', err.message);
      return '';
    }
  }

  return '';
}

function mergePolicyText(existing, extracted, mode, filename) {
  const header = filename ? `\n\n--- Documento: ${filename} ---\n\n` : '\n\n---\n\n';
  const block = `${header}${extracted}`.trim();

  if (mode === 'replace') {
    return extracted.trim();
  }

  const base = String(existing || '').trim();
  if (!base) return extracted.trim();
  return `${base}${block}`;
}

module.exports = {
  extractPolicyTextFromFile,
  mergePolicyText
};
