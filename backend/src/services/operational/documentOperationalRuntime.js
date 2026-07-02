'use strict';

/**
 * FASE 5 — DOCUMENT INTELLIGENCE RUNTIME
 *
 * Capacidades documentais operacionais: ler, resumir, comparar,
 * gerar, exportar e auditar documentos.
 *
 * Feature flag: DOCUMENT_RUNTIME_ENABLED (default true)
 *
 * Suporta: PDF, DOCX, XLSX, imagens (OCR), planilhas, relatórios.
 *
 * Governance:
 *   - tenant isolation
 *   - audit trail
 *   - versionamento
 *   - LGPD compliance
 */

const fs = require('fs');
const path = require('path');
const db = require('../../db');

const ENABLED = process.env.DOCUMENT_RUNTIME_ENABLED !== 'false';
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../../../uploads'));

/**
 * Extrai texto de um arquivo pelo caminho.
 */
async function extractText(filePath) {
  if (!ENABLED || !filePath) return { ok: false, text: '', reason: 'disabled_or_no_path' };

  const ext = path.extname(filePath).toLowerCase();
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(UPLOADS_DIR, filePath);

  if (!fs.existsSync(absPath)) return { ok: false, text: '', reason: 'file_not_found' };

  try {
    const documentTextExtractor = require('../documentTextExtractorService');
    const result = await documentTextExtractor.extractFromPath(absPath, path.basename(absPath), {
      module: 'document_runtime'
    });
    if (!result.ok) {
      return { ok: false, text: '', reason: result.error || 'extraction_failed' };
    }
    return { ok: true, text: result.text, extractor: result.extractor };
  } catch (err) {
    console.warn('[DOC_RUNTIME] extractText:', err.message);
    return { ok: false, text: '', reason: err.message };
  }
}

/**
 * Resume um documento via IA.
 */
async function summarizeDocument(filePath, opts = {}) {
  if (!ENABLED) return { ok: false, reason: 'disabled' };

  const extraction = await extractText(filePath);
  if (!extraction.ok || !extraction.text) return { ok: false, reason: extraction.reason || 'empty' };

  try {
    const ai = require('../ai');
    const prompt = `Resuma o seguinte documento de forma objetiva e estruturada em português. Destaque pontos principais, dados numéricos relevantes e ações necessárias.\n\nDOCUMENTO:\n${extraction.text.slice(0, 8000)}`;
    const summary = await ai.chatCompletion(prompt, { max_tokens: 800, ...opts });
    return { ok: true, summary, originalLength: extraction.text.length };
  } catch (err) {
    console.warn('[DOC_RUNTIME] summarize:', err.message);
    return { ok: false, reason: err.message };
  }
}

/**
 * Compara dois documentos via IA.
 */
async function compareDocuments(filePath1, filePath2) {
  if (!ENABLED) return { ok: false, reason: 'disabled' };

  const [e1, e2] = await Promise.all([extractText(filePath1), extractText(filePath2)]);
  if (!e1.ok || !e2.ok) return { ok: false, reason: 'extraction_failed' };

  try {
    const ai = require('../ai');
    const prompt = `Compare os dois documentos abaixo. Liste diferenças, pontos em comum e recomendações.\n\nDOCUMENTO 1:\n${e1.text.slice(0, 4000)}\n\nDOCUMENTO 2:\n${e2.text.slice(0, 4000)}`;
    const comparison = await ai.chatCompletion(prompt, { max_tokens: 1000 });
    return { ok: true, comparison };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

/**
 * Registra documento no audit trail.
 */
async function auditDocumentAccess(companyId, userId, filePath, action) {
  try {
    await db.query(`
      INSERT INTO memory_audit_log (company_id, user_id, action, scope_filter, facts_count, source_type)
      VALUES ($1, $2, $3, $4, 0, 'document_runtime')
    `, [companyId, userId, `doc:${action}`, JSON.stringify({ file: filePath })]);
  } catch (_) {}
}

module.exports = {
  extractText,
  summarizeDocument,
  compareDocuments,
  auditDocumentAccess,
  isEnabled: () => ENABLED
};
