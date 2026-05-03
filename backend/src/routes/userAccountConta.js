'use strict';

const express = require('express');
const userAccountService = require('../services/userAccountService');

const router = express.Router();
router.use(express.json({ limit: '64kb' }));

function bearerToken(req) {
  const h = req.headers.authorization || req.headers['x-access-token'] || '';
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.replace(/^Bearer\s+/i, '').trim();
  return typeof h === 'string' ? h.trim() : '';
}

router.get('/account', async (req, res) => {
  try {
    const data = await userAccountService.getAccountBundle(req.user.id);
    if (!data) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
    res.json(data);
  } catch (e) {
    console.error('[USER_ACCOUNT_GET]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao carregar conta' });
  }
});

router.patch('/account/profile', async (req, res) => {
  try {
    const out = await userAccountService.patchProfile(req.user.id, req.user.company_id, req.body || {});
    if (!out.ok) return res.status(400).json(out);
    res.json(out);
  } catch (e) {
    console.error('[USER_ACCOUNT_PROFILE]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao atualizar perfil' });
  }
});

router.delete('/account/avatar', async (req, res) => {
  try {
    const out = await userAccountService.clearAvatar(req.user.id);
    res.json(out);
  } catch (e) {
    console.error('[USER_ACCOUNT_AVATAR_DEL]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao remover foto' });
  }
});

router.post('/account/password', async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body || {};
    const out = await userAccountService.changePassword(
      req.user.id,
      current_password,
      new_password,
      confirm_password
    );
    if (!out.ok) return res.status(400).json(out);
    res.json(out);
  } catch (e) {
    console.error('[USER_ACCOUNT_PASSWORD]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao alterar senha' });
  }
});

router.post('/account/verify/send', async (req, res) => {
  try {
    const { channel } = req.body || {};
    const out = await userAccountService.sendVerifyCode(req.user.id, channel);
    if (!out.ok) return res.status(400).json(out);
    res.json(out);
  } catch (e) {
    console.error('[USER_ACCOUNT_VERIFY_SEND]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao enviar código' });
  }
});

router.post('/account/verify/confirm', async (req, res) => {
  try {
    const { channel, code } = req.body || {};
    const out = await userAccountService.confirmVerifyCode(req.user.id, channel, code);
    if (!out.ok) return res.status(400).json(out);
    res.json(out);
  } catch (e) {
    console.error('[USER_ACCOUNT_VERIFY_CONFIRM]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao confirmar' });
  }
});

router.patch('/account/notifications', async (req, res) => {
  try {
    const out = await userAccountService.patchNotificationPrefs(req.user.id, req.body || {});
    if (!out.ok) return res.status(400).json(out);
    res.json(out);
  } catch (e) {
    console.error('[USER_ACCOUNT_NOTIF]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao salvar' });
  }
});

router.patch('/account/ui', async (req, res) => {
  try {
    const out = await userAccountService.patchUiPrefs(req.user.id, req.body || {});
    if (!out.ok) return res.status(400).json(out);
    res.json(out);
  } catch (e) {
    console.error('[USER_ACCOUNT_UI]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao salvar' });
  }
});

router.get('/account/sessions', async (req, res) => {
  try {
    const token = bearerToken(req);
    const sessions = await userAccountService.listSessions(req.user.id, token);
    res.json({ ok: true, sessions });
  } catch (e) {
    console.error('[USER_ACCOUNT_SESSIONS]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao listar sessões' });
  }
});

router.delete('/account/sessions/:id', async (req, res) => {
  try {
    const token = bearerToken(req);
    const out = await userAccountService.deleteSession(req.user.id, req.params.id, token);
    if (!out.ok) return res.status(404).json(out);
    res.json(out);
  } catch (e) {
    console.error('[USER_ACCOUNT_SESSION_DEL]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao encerrar sessão' });
  }
});

router.post('/account/sessions/revoke-others', async (req, res) => {
  try {
    const token = bearerToken(req);
    const out = await userAccountService.revokeOtherSessions(req.user.id, token);
    if (!out.ok) return res.status(400).json(out);
    res.json(out);
  } catch (e) {
    console.error('[USER_ACCOUNT_SESSION_REVOKE]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao encerrar sessões' });
  }
});

module.exports = router;
