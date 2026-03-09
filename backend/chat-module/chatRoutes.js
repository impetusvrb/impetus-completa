/**
 * IMPETUS CHAT MODULE - Rotas REST
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const chatService = require('./chatService');
const chatAIService = require('./chatAIService');
const { broadcast } = require('./chatBroadcast');
const { requireAuth } = require('../src/middleware/auth');
const { requireCompanyActive } = require('../src/middleware/multiTenant');
const { isValidUUID } = require('../src/utils/security');

const MESSAGE_TYPES = ['text', 'image', 'video', 'audio', 'document', 'ai'];

const UPLOAD_DIR = process.env.CHAT_UPLOAD_DIR || path.join(__dirname, '../..', 'uploads', 'chat');
const MAX_FILE_SIZE = parseInt(process.env.CHAT_MAX_FILE_MB || '25', 10) * 1024 * 1024;

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|webm|mp3|m4a|wav|oga|pdf|doc|docx|xls|xlsx)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido'));
  }
});

router.use(requireAuth, requireCompanyActive);

router.get('/colaboradores', async (req, res) => {
  try {
    const list = await chatService.listColaboradores(req.user.company_id, req.user.id);
    res.json({ ok: true, colaboradores: list });
  } catch (err) {
    console.error('[CHAT_COLABORADORES]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar colaboradores' });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 30);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const list = await chatService.listConversations(req.user.company_id, req.user.id, limit, offset);
    res.json({ ok: true, conversations: list });
  } catch (err) {
    console.error('[CHAT_CONVERSATIONS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar conversas' });
  }
});

router.post('/conversations', async (req, res) => {
  try {
    const { type = 'private', participant_id, name, participant_ids } = req.body;
    if (type === 'private') {
      if (!participant_id || !isValidUUID(participant_id))
        return res.status(400).json({ ok: false, error: 'participant_id inválido' });
      const conv = await chatService.getOrCreatePrivateConversation(
        req.user.company_id, req.user.id, participant_id
      );
      return res.json({ ok: true, conversation: conv });
    }
    if (type === 'group') {
      const ids = Array.isArray(participant_ids) ? participant_ids : [];
      const conv = await chatService.createGroup(req.user.company_id, req.user.id, name, ids);
      return res.status(201).json({ ok: true, conversation: conv });
    }
    res.status(400).json({ ok: false, error: 'type deve ser private ou group' });
  } catch (err) {
    console.error('[CHAT_CREATE_CONV]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao criar conversa' });
  }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const ok = await chatService.isParticipant(id, req.user.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
    const db = require('../src/db');
    const conv = await db.query('SELECT * FROM chat_conversations WHERE id = $1', [id]);
    if (!conv?.rows?.length) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
    const participants = await chatService.getParticipants(id);
    res.json({ ok: true, conversation: { ...conv.rows[0], participants } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const beforeId = req.query.before_id || null;
    const messages = await chatService.listMessages(id, req.user.id, limit, beforeId);
    if (messages === null) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
    res.json({ ok: true, messages });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/conversations/:id/messages', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const ok = await chatService.isParticipant(id, req.user.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });

    let messageType = req.body.message_type || 'text';
    let content = req.body.content?.trim() || null;
    let fileUrl = req.body.file_url || null;
    let fileName = req.body.file_name || null;
    let fileSizeBytes = req.body.file_size_bytes ? parseInt(req.body.file_size_bytes, 10) : null;
    let fileDurationSeconds = req.body.file_duration_seconds ? parseInt(req.body.file_duration_seconds, 10) : null;

    if (req.file) {
      fileUrl = `/uploads/chat/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSizeBytes = req.file.size;
      const ext = (path.extname(fileName) || '').toLowerCase();
      if (['.mp4', '.webm', '.mov'].includes(ext)) messageType = 'video';
      else if (['.mp3', '.m4a', '.wav', '.oga'].includes(ext)) messageType = 'audio';
      else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) messageType = 'image';
      else if (['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext)) messageType = 'document';
    }

    if (messageType === 'text' && !content) return res.status(400).json({ ok: false, error: 'Conteúdo obrigatório' });
    if (!MESSAGE_TYPES.includes(messageType)) return res.status(400).json({ ok: false, error: 'message_type inválido' });

    const msg = await chatService.sendMessage({
      conversationId: id,
      senderId: req.user.id,
      messageType,
      content,
      fileUrl,
      fileName,
      fileSizeBytes,
      fileDurationSeconds,
      clientIp: req.ip,
      source: req.body.source || 'web'
    });

    broadcast(id, { ...msg, sender_name: req.user.name, sender_avatar: req.user.avatar_url });
    res.status(201).json({ ok: true, message: msg });
  } catch (err) {
    console.error('[CHAT_SEND]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao enviar mensagem' });
  }
});

router.post('/conversations/:id/invoke-ai', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, context } = req.body;
    if (!isValidUUID(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const ok = await chatService.isParticipant(id, req.user.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });

    const aiMsg = await chatAIService.invokeAI({
      companyId: req.user.company_id,
      conversationId: id,
      requestedBy: req.user.id,
      action: action || 'resumir',
      context: context || {}
    });

    res.json({ ok: true, message: aiMsg });
  } catch (err) {
    console.error('[CHAT_INVOKE_AI]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro na IA' });
  }
});

router.post('/add-impetus-ia/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!isValidUUID(conversationId)) return res.status(400).json({ ok: false });
    const ok = await chatService.isParticipant(conversationId, req.user.id);
    if (!ok) return res.status(404).json({ ok: false });
    const aiUserId = await chatService.ensureImpetusIAUser(req.user.company_id);
    const db = require('../src/db');
    await db.query(`
      INSERT INTO chat_conversation_participants (conversation_id, user_id) VALUES ($1, $2)
      ON CONFLICT (conversation_id, user_id) DO NOTHING
    `, [conversationId, aiUserId]);
    res.json({ ok: true, message: 'Impetus IA adicionada ao grupo' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
