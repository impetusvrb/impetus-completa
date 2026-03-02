/**
 * ROTAS DO CHAT INTERNO - Impetus Comunica IA
 * Comunicação tipo WhatsApp entre colaboradores
 * Conecta ao banco existente, reutiliza auth e tenant
 */

const express = require('express');
const router = express.Router();
const internalChatService = require('../services/internalChatService');
const { requireAuth } = require('../middleware/auth');
const { requireCompanyActive } = require('../middleware/multiTenant');
const { isValidUUID } = require('../utils/security');

const MESSAGE_TYPES = ['text', 'audio', 'video', 'image', 'document'];

/**
 * GET /api/internal-chat/colaboradores
 * Lista colaboradores da empresa para iniciar conversa
 */
router.get('/colaboradores', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const colaboradores = await internalChatService.listColaboradores(
      req.user.company_id,
      req.user.id
    );
    res.json({ ok: true, colaboradores });
  } catch (err) {
    console.error('[INTERNAL_CHAT_COLABORADORES]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar colaboradores' });
  }
});

/**
 * GET /api/internal-chat/conversations
 * Lista conversas do usuário
 */
router.get('/conversations', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 30);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const conversations = await internalChatService.listConversations(
      req.user.company_id,
      req.user.id,
      limit,
      offset
    );
    res.json({ ok: true, conversations });
  } catch (err) {
    console.error('[INTERNAL_CHAT_CONVERSATIONS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar conversas' });
  }
});

/**
 * POST /api/internal-chat/conversations
 * Cria ou retorna conversa 1:1 com outro colaborador
 */
router.post('/conversations', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const { participant_id } = req.body;
    if (!participant_id || !isValidUUID(participant_id)) {
      return res.status(400).json({ ok: false, error: 'participant_id inválido' });
    }

    const conversation = await internalChatService.getOrCreateConversation(
      req.user.company_id,
      req.user.id,
      participant_id
    );
    res.json({ ok: true, conversation });
  } catch (err) {
    console.error('[INTERNAL_CHAT_CREATE_CONV]', err);
    res.status(500).json({ ok: false, error: 'Erro ao criar conversa' });
  }
});

/**
 * GET /api/internal-chat/conversations/:id/messages
 * Lista mensagens de uma conversa
 */
router.get('/conversations/:id/messages', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ ok: false, error: 'ID inválido' });
    }

    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const beforeId = req.query.before_id || null;

    const messages = await internalChatService.listMessages(
      id,
      req.user.id,
      limit,
      beforeId
    );

    if (messages === null) {
      return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
    }

    res.json({ ok: true, messages });
  } catch (err) {
    console.error('[INTERNAL_CHAT_MESSAGES]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar mensagens' });
  }
});

/**
 * POST /api/internal-chat/conversations/:id/messages
 * Envia mensagem (texto, áudio, vídeo)
 */
router.post('/conversations/:id/messages', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ ok: false, error: 'ID inválido' });
    }

    const {
      message_type = 'text',
      text_content,
      media_url,
      media_filename,
      media_size_bytes,
      media_duration_seconds,
      storage_provider
    } = req.body;

    if (!MESSAGE_TYPES.includes(message_type)) {
      return res.status(400).json({
        ok: false,
        error: `message_type deve ser: ${MESSAGE_TYPES.join(', ')}`
      });
    }

    if (message_type === 'text' && !text_content?.trim()) {
      return res.status(400).json({ ok: false, error: 'text_content obrigatório para mensagem de texto' });
    }

    if ((message_type === 'audio' || message_type === 'video') && !media_url) {
      return res.status(400).json({
        ok: false,
        error: 'media_url obrigatório para áudio e vídeo'
      });
    }

    const msg = await internalChatService.sendMessage({
      companyId: req.user.company_id,
      conversationId: id,
      senderId: req.user.id,
      messageType: message_type,
      textContent: text_content?.trim() || null,
      mediaUrl: media_url || null,
      mediaFilename: media_filename || null,
      mediaSizeBytes: media_size_bytes || null,
      mediaDurationSeconds: media_duration_seconds || null,
      storageProvider: storage_provider || null,
      clientIp: req.ip || req.connection?.remoteAddress,
      source: 'app'
    });

    res.status(201).json({ ok: true, message: msg });
  } catch (err) {
    console.error('[INTERNAL_CHAT_SEND]', err);
    res.status(500).json({ ok: false, error: 'Erro ao enviar mensagem' });
  }
});

/**
 * POST /api/internal-chat/conversations/:id/read
 * Marca mensagens da conversa como lidas
 */
router.post('/conversations/:id/read', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ ok: false, error: 'ID inválido' });
    }

    await internalChatService.markAsRead(id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[INTERNAL_CHAT_READ]', err);
    res.status(500).json({ ok: false, error: 'Erro ao marcar como lido' });
  }
});

module.exports = router;
