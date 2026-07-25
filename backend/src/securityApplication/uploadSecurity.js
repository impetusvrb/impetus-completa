'use strict';

/**
 * APPSEC-01 — Enterprise Upload Security (magic bytes + quarentena preparada)
 */

const fs = require('fs');
const path = require('path');
const flags = require('./config/appsecFlags');

const AUDIT_EVENT = 'APPSEC_UPLOAD_SECURITY';

/** Assinaturas mágicas mínimas (primeiros bytes) */
const MAGIC_SIGNATURES = Object.freeze({
  '.pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }],
  '.png': [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  '.jpg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  '.jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  '.gif': [{ offset: 0, bytes: [0x47, 0x49, 0x46] }],
  '.webp': [{ offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }],
  '.zip': [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  '.mp3': [{ offset: 0, bytes: [0x49, 0x44, 0x33] }, { offset: 0, bytes: [0xff, 0xfb] }],
  '.wav': [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }],
  '.ogg': [{ offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] }]
});

function auditUpload(event, meta) {
  try {
    console.info(`[${AUDIT_EVENT}]`, JSON.stringify({ event, at: new Date().toISOString(), ...meta }));
  } catch (_) { /* never break */ }
}

function readFileHead(filePath, len = 16) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(len);
    const read = fs.readSync(fd, buf, 0, len, 0);
    return buf.slice(0, read);
  } finally {
    fs.closeSync(fd);
  }
}

function matchesMagic(head, signature) {
  for (let i = 0; i < signature.bytes.length; i++) {
    if (head[signature.offset + i] !== signature.bytes[i]) return false;
  }
  return true;
}

/**
 * @param {string} filePath
 * @param {string} ext — com ponto, ex. .pdf
 * @returns {{ ok: boolean, error?: string }}
 */
function validateMagicBytes(filePath, ext) {
  if (!flags.isUploadSecurityStrict()) return { ok: true, skipped: true };
  const normalized = String(ext || '').toLowerCase();
  const sigs = MAGIC_SIGNATURES[normalized];
  if (!sigs) {
    return { ok: true, skipped: true, reason: 'no_signature_for_ext' };
  }
  let head;
  try {
    head = readFileHead(filePath, 16);
  } catch (e) {
    return { ok: false, error: `Não foi possível ler ficheiro: ${e.message}` };
  }
  const match = sigs.some((s) => matchesMagic(head, s));
  if (!match) {
    auditUpload('MAGIC_MISMATCH', { filePath, ext: normalized });
    return { ok: false, error: 'Conteúdo do ficheiro não corresponde à extensão declarada' };
  }
  return { ok: true };
}

/**
 * Middleware pós-multer — valida magic bytes do ficheiro recebido.
 */
function postUploadMagicValidator(getExtFromFile = (file) => path.extname(file?.originalname || '')) {
  return (req, res, next) => {
    const files = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...req.files);
    for (const file of files) {
      const ext = getExtFromFile(file);
      const fp = file.path;
      if (!fp) continue;
      const r = validateMagicBytes(fp, ext);
      if (!r.ok) {
        try {
          fs.unlinkSync(fp);
        } catch (_) { /* ignore */ }
        auditUpload('REJECTED', { reason: r.error, originalname: file.originalname });
        return res.status(415).json({
          ok: false,
          error: r.error,
          code: 'UPLOAD_MAGIC_BYTES_INVALID'
        });
      }
    }
    next();
  };
}

function getQuarantineDir(baseUploadDir) {
  return path.join(baseUploadDir, '.quarantine');
}

module.exports = {
  AUDIT_EVENT,
  MAGIC_SIGNATURES,
  validateMagicBytes,
  postUploadMagicValidator,
  getQuarantineDir
};
