const express = require('express');
const router = express.Router();
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const chatService = require('../services/chatService');
const { requireAuth } = require('../middleware/auth');
const { handleAIMessage, mentionsAI } = require('../services/chatAIService');
const executiveMode = require('../services/executiveMode');
const db = require('../db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../../../uploads/chat')),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 52428800 } });
const getIo = req => req.app.get('io');

// Todas as rotas de chat exigem usuário autenticado
router.use(requireAuth);

router.get('/conversations', async (req, res) => {
  try { res.json(await chatService.getConversations(req.user.id, req.user.company_id)); }
  catch (e) { res.status(500).json({ error: 'Erro ao buscar conversas' }); }
});
router.post('/conversations', async (req, res) => {
  try {
    const { type, targetUserId, name, participantIds } = req.body;
    let conv;
    if (type === 'private') conv = await chatService.getOrCreatePrivateConversation(req.user.id, targetUserId, req.user.company_id);
    else if (type === 'group') conv = await chatService.createGroup(req.user.id, req.user.company_id, name, participantIds || []);
    else return res.status(400).json({ error: 'type invalido' });
    res.json(conv);
  } catch (e) { res.status(e.status||500).json({ error: e.message }); }
});
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { before, limit } = req.query;
    res.json(await chatService.getMessages(req.params.id, req.user.id, parseInt(limit)||50, before));
  } catch (e) { res.status(e.status||500).json({ error: e.message }); }
});
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { content, replyTo } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Conteudo obrigatorio' });
    await chatService.verifyParticipant(req.params.id, req.user.id);

    if (req.user.role === 'ceo' && req.user.company_id) {
      const ceoResult = await executiveMode.processCEOMessageFromWeb(
        req.user.company_id, req.user.id, content.trim(), 'text', null, null
      );
      if (ceoResult.handled && ceoResult.response) {
        const msg = await chatService.saveMessage({ conversationId: req.params.id, senderId: req.user.id, type: 'text', content: content.trim(), replyTo });
        const io = getIo(req);
        if (io) io.to(req.params.id).emit('new_message', msg);
        const sysMsg = await chatService.saveMessage({
          conversationId: req.params.id,
          senderId: chatService.AI_USER_ID,
          type: 'text',
          content: `**Impetus (Modo Executivo):**\n\n${ceoResult.response}`
        });
        if (io) io.to(req.params.id).emit('new_message', sysMsg);
        return res.json(msg);
      }
    }

    const msg = await chatService.saveMessage({ conversationId: req.params.id, senderId: req.user.id, type: 'text', content: content.trim(), replyTo });
    const io = getIo(req);
    if (io) io.to(req.params.id).emit('new_message', msg);
    if (mentionsAI(content)) setImmediate(() => handleAIMessage(req.params.id, content, io));
    res.json(msg);
  } catch (e) { res.status(e.status||500).json({ error: e.message }); }
});
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatorio' });
    const { conversationId, replyTo } = req.body;
    await chatService.verifyParticipant(conversationId, req.user.id);
    const t = req.file.mimetype;
    const fileType = t.startsWith('image/') ? 'image' : t.startsWith('video/') ? 'video' : t.startsWith('audio/') ? 'audio' : 'document';
    const msg = await chatService.saveMessage({ conversationId, senderId: req.user.id, type: fileType, content: req.file.originalname, fileUrl: '/uploads/chat/' + req.file.filename, fileName: req.file.originalname, fileSize: req.file.size, replyTo });
    const io = getIo(req);
    if (io) io.to(conversationId).emit('new_message', msg);

    if (req.user.role === 'ceo' && req.user.company_id && (fileType === 'document' || fileType === 'image')) {
      let documentBase64 = null;
      try {
        const filePath = req.file.path || path.join(__dirname, '../../../../uploads/chat', req.file.filename);
        const buf = fs.readFileSync(filePath);
        documentBase64 = buf.toString('base64');
      } catch (readErr) {
        console.warn('[CHAT] CEO doc read:', readErr.message);
      }
      const ceoResult = await executiveMode.processCEOMessageFromWeb(
        req.user.company_id, req.user.id, req.file.originalname, fileType,
        '/uploads/chat/' + req.file.filename, documentBase64
      );
      if (ceoResult.handled && ceoResult.response) {
        const sysMsg = await chatService.saveMessage({
          conversationId,
          senderId: chatService.AI_USER_ID,
          type: 'text',
          content: `**Impetus (Modo Executivo):**\n\n${ceoResult.response}`
        });
        if (io) io.to(conversationId).emit('new_message', sysMsg);
      }
    }

    res.json(msg);
  } catch (e) { res.status(e.status||500).json({ error: e.message }); }
});
router.put('/messages/:id/read', async (req, res) => {
  try { await chatService.markAsRead(req.body.conversationId, req.user.id); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'Erro' }); }
});
router.get('/conversations/:id/participants', async (req, res) => {
  try { res.json(await chatService.getConversationParticipants(req.params.id, req.user.id)); }
  catch (e) { res.status(e.status||500).json({ error: e.message }); }
});
router.post('/conversations/:id/participants', async (req, res) => {
  try { await chatService.addParticipant(req.params.id, req.user.id, req.body.userId); res.json({ ok: true }); }
  catch (e) { res.status(e.status||500).json({ error: e.message }); }
});
router.delete('/conversations/:id/participants/:uid', async (req, res) => {
  try { await chatService.removeParticipant(req.params.id, req.user.id, req.params.uid); res.json({ ok: true }); }
  catch (e) { res.status(e.status||500).json({ error: e.message }); }
});
router.get('/users', async (req, res) => {
  try { res.json(await chatService.getCompanyUsers(req.user.company_id, req.user.id)); }
  catch { res.status(500).json({ error: 'Erro' }); }
});
router.post('/push/subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    await chatService.savePushSubscription(req.user.id, endpoint, keys.p256dh, keys.auth);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Erro' }); }
});

// Atualizar avatar do usuário a partir do chat
router.post('/me/avatar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório' });
    const url = '/uploads/chat/' + req.file.filename;
    await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [url, req.user.id]);
    res.json({ ok: true, avatar_url: url });
  } catch (e) {
    console.error('[CHAT_AVATAR_UPDATE]', e.message);
    res.status(500).json({ error: 'Erro ao atualizar avatar' });
  }
});

module.exports = router;
