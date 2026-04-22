/**
 * Entrega de ficheiros /uploads com autenticação (evita <img> público sem controlo).
 * GET /api/media/file?path=/uploads/chat/...
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { requireCompanyActive } = require('../middleware/multiTenant');
const { resolveUploadFile } = require('../paths');
const { userCanReadUpload } = require('../services/uploadAccessService');

router.get('/file', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const raw = req.query.path;
    if (!raw || typeof raw !== 'string') {
      return res.status(400).json({ ok: false, error: 'path obrigatório' });
    }
    const decoded = decodeURIComponent(raw.trim());
    if (!decoded.startsWith('/uploads/')) {
      return res.status(400).json({ ok: false, error: 'path inválido' });
    }
    const rel = decoded.replace(/^\/uploads\/?/, '');
    if (!rel || rel.includes('..')) {
      return res.status(400).json({ ok: false, error: 'path inválido' });
    }
    const abs = resolveUploadFile(rel);
    if (!abs) {
      return res.status(404).json({ ok: false, error: 'Ficheiro não encontrado' });
    }
    const ok = await userCanReadUpload(req.user, rel);
    if (!ok) {
      return res.status(403).json({ ok: false, error: 'Acesso negado' });
    }
    const ext = path.extname(abs).toLowerCase();
    const mime = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg'
    }[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.sendFile(abs);
  } catch (e) {
    console.error('[MEDIA_FILE]', e.message);
    return res.status(500).json({ ok: false, error: 'Erro ao servir ficheiro' });
  }
});

module.exports = router;
