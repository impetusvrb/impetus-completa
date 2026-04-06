const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const db = require('../db');
const manualsService = require('../services/manuals');
const { requireAuth, requireCompanyId } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'manuals-legacy-' + uniqueSuffix + path.extname(file.originalname || '.pdf'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

/**
 * POST /api/manuals/upload — alinhado ao modelo multi-tenant (company_id + uploaded_by).
 * Requer o mesmo esquema que /api/admin/settings/manuals.
 */
router.post('/upload', requireAuth, requireCompanyId, upload.single('file'), async (req, res) => {
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
      await db.query('UPDATE manuals SET embedding_processed = true WHERE id = $1', [manualId]);
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
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
