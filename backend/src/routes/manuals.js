const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../db');
const manualsService = require('../services/manuals');
const { requireAuth, requireCompanyId } = require('../middleware/auth');
const { createUploadMiddleware, handleUploadError } = require('../middleware/impetusUploadMiddleware');
const { postUploadMagicValidator } = require('../securityApplication/uploadSecurity');

const uploadPaths = require('../config/uploadPaths');

const manualsUpload = createUploadMiddleware({
  module: 'manuals_legacy',
  destination: uploadPaths.root(),
  allowedGroups: ['document'],
  fieldName: 'file'
});

/**
 * POST /api/manuals/upload — alinhado ao modelo multi-tenant (company_id + uploaded_by).
 * Requer o mesmo esquema que /api/admin/settings/manuals.
 */
router.post(
  '/upload',
  requireAuth,
  requireCompanyId,
  manualsUpload.single,
  postUploadMagicValidator(),
  handleUploadError('manuals_legacy'),
  async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Arquivo não enviado' });
    }

    const title = (req.body.title || req.file.originalname || 'manual').trim();
    const fileUrl = `/uploads/${req.file.filename}`;
    const filePath = req.file.path;

    const text = await manualsService.extractTextFromFile(filePath);
    const result = await db.query(
      `INSERT INTO manuals (
        company_id, equipment_type, model, manufacturer,
        file_url, uploaded_by, embedding_processed, manual_type
      ) VALUES ($1, $2, $3, $4, $5, $6, false, $7)
      RETURNING id`,
      [
        req.user.company_id,
        title.slice(0, 120),
        '',
        '',
        fileUrl,
        req.user.id,
        'maquina'
      ]
    );

    const manualId = result.rows[0].id;
    if (text && text.length >= 20) {
    await manualsService.chunkAndEmbedManual(manualId, text);
      await db.query('UPDATE manuals SET embedding_processed = true WHERE id = $1 AND company_id = $2', [manualId, req.user.company_id]);
    }

    res.json({ ok: true, manualId });
  } catch (err) {
    console.error('[MANUALS_UPLOAD]', err);
    if (err.message && err.message.includes('column')) {
      return res.status(500).json({
        ok: false,
        error:
          'Esquema de manuals incompatível. Use /api/admin/settings/manuals ou alinhe a tabela manuals.',
        code: 'MANUALS_SCHEMA'
      });
    }
    res.status(500).json({ ok: false, error: err.message || 'Erro ao enviar manual' });
  }
});

module.exports = router;
