/**
 * ROTAS APP COMMUNICATIONS
 * Recebe mensagens do App Impetus (texto, áudio, vídeo)
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { requireCompanyActive } = require('../middleware/multiTenant');
const { isValidUUID } = require('../utils/security');
const appCommunicationService = require('../services/appCommunicationService');
const db = require('../db');

const UPLOAD_DIR = path.join(__dirname, '../../..', 'uploads', 'app-communications');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_MB = parseInt(process.env.APP_COMM_MAX_FILE_MB || '25', 10) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_MB },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(mp3|m4a|wav|ogg|webm|mp4|mov|webm)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Apenas áudio (mp3,m4a,wav) e vídeo (mp4,webm) são permitidos'));
  }
});

const protected = [requireAuth, requireCompanyActive];

router.post('/', protected, upload.single('media'), async (req, res) => {
  try {
    const {
      text_content,
      message_type = 'text',
      recipient_id,
      recipient_department_id,
      related_equipment_id
    } = req.body;

    const user = req.user;
    let messageType = message_type;

    let mediaPath = null;
    let mediaUrl = null;

    if (req.file) {
      mediaPath = req.file.path;
      mediaUrl = `/uploads/app-communications/${req.file.filename}`;
      const ext = path.extname(req.file.originalname || '').toLowerCase();
      if (['.mp4', '.webm', '.mov'].includes(ext)) messageType = 'video';
      else if (['.mp3', '.m4a', '.wav', '.ogg'].includes(ext)) messageType = 'audio';
    }

    const text = (text_content || '').trim();

    if (!text && !mediaPath) {
      return res.status(400).json({ ok: false, error: 'Envie texto ou áudio/vídeo' });
    }

    const result = await appCommunicationService.processAppMessage({
      companyId: user.company_id,
      senderId: user.id,
      senderName: user.name,
      senderPhone: user.whatsapp_number || user.phone,
      textContent: text,
      messageType,
      mediaPath,
      mediaUrl,
      recipientId: isValidUUID(recipient_id) ? recipient_id : null,
      recipientDepartmentId: isValidUUID(recipient_department_id) ? recipient_department_id : null,
      relatedEquipmentId: isValidUUID(related_equipment_id) ? related_equipment_id : null
    });

    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.error });
    }

    res.status(201).json({
      ok: true,
      communication_id: result.communicationId,
      task_id: result.taskId,
      classification: result.classification
    });
  } catch (err) {
    console.error('[APP_COMM_ROUTES]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao processar comunicação' });
  }
});

router.get('/', protected, async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const { buildCommunicationsFilter } = require('../services/hierarchicalFilter');
    const scope = await require('../services/hierarchicalFilter').resolveHierarchyScope(req.user);
    const filter = buildCommunicationsFilter(scope, req.user.company_id, { tableAlias: 'c' });

    const result = await db.query(`
      SELECT c.id, c.text_content, c.message_type, c.media_url, c.media_transcription,
             c.ai_classification, c.ai_priority, c.status, c.created_at,
             c.direction, c.sender_name, c.recipient_id
      FROM communications c
      WHERE c.source = 'app' AND ${filter.whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${filter.params.length + 1} OFFSET $${filter.params.length + 2}
    `, [...filter.params, limit, offset]);

    res.json({ ok: true, communications: result.rows });
  } catch (err) {
    console.error('[APP_COMM_LIST]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/notifications', protected, async (req, res) => {
  try {
    const limit = Math.min(30, parseInt(req.query.limit, 10) || 15);
    const r = await db.query(`
      SELECT id, text_content, communication_id, sent_at, read_at
      FROM app_notifications
      WHERE recipient_id = $1
      ORDER BY sent_at DESC
      LIMIT $2
    `, [req.user.id, limit]);
    res.json({ ok: true, notifications: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
