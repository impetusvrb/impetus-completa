/**
 * ROTAS APP IMPETUS - Canal de Comunicação Unificado
 * Canal de mensagens: entrada e saída via App Impetus
 */

const express = require('express');
const router = express.Router();
const appImpetusService = require('../services/appImpetusService');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireCompanyActive } = require('../middleware/multiTenant');

/**
 * POST /api/app-impetus/messages
 * Recebe mensagem do App Impetus (usuário enviou mensagem no app)
 * Requer autenticação: Bearer token do usuário logado no app
 */
router.post('/messages', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { text, message_type, media_url, media_base64, metadata } = req.body;

    const senderUserId = req.user.id;
    const senderPhone = req.user.whatsapp_number || req.user.phone || '';

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ ok: false, error: 'Campo text é obrigatório' });
    }

    const payload = {
      sender_user_id: senderUserId,
      sender_phone: senderPhone,
      text: text.trim(),
      message_type: message_type || 'text',
      media_url: media_url || null,
      media_base64: media_base64 || null,
      metadata: metadata || {}
    };

    const result = await appImpetusService.processIncomingFromApp(companyId, payload);

    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[APP_IMPETUS_MESSAGES_ERROR]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/app-impetus/outbox
 * App Impetus busca mensagens pendentes para o usuário autenticado
 * Retorna mensagens onde recipient_phone = telefone do usuário
 */
router.get('/outbox', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;
    const since = req.query.since || req.query.since_id;

    const userPhone = req.user.whatsapp_number || req.user.phone || '';
    const phoneNorm = appImpetusService.normalizePhone(userPhone);

    if (phoneNorm.length < 10) {
      return res.json({ ok: true, messages: [] });
    }

    let query = `
      SELECT id, company_id, recipient_phone, text_content, originated_from, created_at
      FROM app_impetus_outbox
      WHERE company_id = $1 AND recipient_phone = $2 AND status = 'pending'
    `;
    const params = [companyId, phoneNorm];

    if (since) {
      if (/^[0-9a-f-]{36}$/i.test(since)) {
        query += ` AND id::text > $3`;
        params.push(since);
      } else {
        query += ` AND created_at > $3::timestamptz`;
        params.push(since);
      }
    }

    query += ` ORDER BY created_at ASC LIMIT 50`;

    const result = await db.query(query, params);
    const messages = result.rows;

    if (messages.length > 0) {
      const ids = messages.map(m => m.id);
      await db.query(
        `UPDATE app_impetus_outbox SET status = 'delivered', delivered_at = now() WHERE id = ANY($1)`,
        [ids]
      );
    }

    res.json({
      ok: true,
      messages: messages.map(m => ({
        id: m.id,
        company_id: m.company_id,
        recipient_phone: m.recipient_phone,
        text_content: m.text_content,
        originated_from: m.originated_from,
        created_at: m.created_at
      }))
    });
  } catch (err) {
    console.error('[APP_IMPETUS_OUTBOX_ERROR]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/app-impetus/status
 * Status do canal App Impetus (sempre ativo quando unificado)
 */
router.get('/status', requireAuth, requireCompanyActive, (req, res) => {
  res.json({
    ok: true,
    channel: 'app_impetus',
    status: 'connected',
    message: 'Comunicação integrada via App Impetus'
  });
});

module.exports = router;
