'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../../db');
const { signAdminToken, requireAdminAuth } = require('../../middleware/adminPortalAuth');
const { adminPortalLoginLimiter } = require('../../middleware/globalRateLimit');
const { logAdminAction } = require('../../services/adminPortalLogService');
const botGuard = require('../../services/adminPortalBotGuard');
const adminMfa = require('../../services/adminPortalMfaService');
const deviceTrust = require('../../services/adminPortalDeviceTrustService');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
  challengeToken: z.string().optional().nullable(),
  challengeAnswer: z.union([z.string(), z.number()]).optional().nullable(),
  turnstileToken: z.string().optional().nullable(),
  _hp: z.string().optional().nullable(),
  device_id: z.string().max(128).optional().nullable(),
  device_label: z.string().max(120).optional().nullable()
});

const mfaVerifySchema = z.object({
  mfa_challenge_token: z.string().min(8),
  code: z.string().min(4).max(12)
});

router.get('/bot-config', (_req, res) => {
  res.json({ ok: true, ...botGuard.getPublicConfig() });
});

router.get('/human-check', (_req, res) => {
  if (!botGuard.humanCheckEnabled()) {
    return res.json({ ok: true, mode: 'disabled' });
  }
  if (botGuard.useTurnstileForLogin()) {
    return res.json({ ok: true, mode: 'turnstile', ...botGuard.getPublicConfig() });
  }
  res.json({ ok: true, ...botGuard.issueHumanChallenge() });
});

router.post('/login', adminPortalLoginLimiter, async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const bot = await botGuard.verifyLoginBotGuard(req, body);
    if (!bot.ok) {
      await logAdminAction({
        acao: 'login_bloqueado_bot',
        entidade: 'auth',
        ip: req.ip,
        detalhes: { email: body.email, code: bot.code }
      });
      return res.status(403).json({ ok: false, error: bot.error, code: bot.code });
    }

    const email = body.email.trim().toLowerCase();
    const r = await db.query(
      `SELECT id, nome, email, senha_hash, perfil, ativo FROM admin_users WHERE lower(email) = $1`,
      [email]
    );
    if (!r.rows.length) {
      await logAdminAction({
        acao: 'login_falhou',
        entidade: 'auth',
        ip: req.ip,
        detalhes: { email }
      });
      return res.status(401).json({ ok: false, error: 'Email ou senha inválidos', code: 'ADMIN_LOGIN_FAILED' });
    }
    const user = r.rows[0];
    if (!user.ativo) {
      return res.status(403).json({ ok: false, error: 'Usuário inativo', code: 'ADMIN_INACTIVE' });
    }
    const ok = bcrypt.compareSync(body.senha, user.senha_hash);
    if (!ok) {
      await logAdminAction({
        adminUserId: user.id,
        acao: 'login_falhou',
        entidade: 'auth',
        ip: req.ip,
        detalhes: { email }
      });
      return res.status(401).json({ ok: false, error: 'Email ou senha inválidos', code: 'ADMIN_LOGIN_FAILED' });
    }

    await db.query(`UPDATE admin_users SET last_login_at = now(), updated_at = now() WHERE id = $1`, [user.id]);

    const trust = await deviceTrust.assertLoginAuthorized(user, req, body);
    if (!trust.ok) {
      await logAdminAction({
        adminUserId: user.id,
        acao: trust.code === 'ADMIN_DEVICE_PENDING' ? 'login_dispositivo_pendente' : 'login_dispositivo_bloqueado',
        entidade: 'auth',
        ip: deviceTrust.clientIp(req),
        detalhes: { email: user.email, code: trust.code, pending_id: trust.pending_id, ip: trust.ip }
      });
      return res.status(403).json({
        ok: false,
        error: trust.error,
        code: trust.code,
        device_pending: !!trust.device_pending,
        pending_id: trust.pending_id || null
      });
    }

    if (await adminMfa.isMfaRequired(user.id)) {
      const ch = adminMfa.issueMfaChallenge(user.id);
      adminMfa.storeChallenge(ch);
      return res.json({
        ok: true,
        mfa_required: true,
        mfa_challenge_token: ch.token,
        methods: ['totp'],
        user_preview: { email: user.email, nome: user.nome }
      });
    }

    const token = signAdminToken(user);
    await logAdminAction({
      adminUserId: user.id,
      acao: 'login',
      entidade: 'auth',
      ip: req.ip,
      detalhes: { email: user.email, bot_mode: bot.mode || null }
    });

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil
      }
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Dados inválidos', details: e.errors });
    }
    console.error('[impetusAdmin/login]', e);
    res.status(500).json({ ok: false, error: 'Erro ao autenticar' });
  }
});

router.post('/login/mfa-verify', adminPortalLoginLimiter, async (req, res) => {
  try {
    const body = mfaVerifySchema.parse(req.body);
    const adminUserId = adminMfa.consumeChallenge(body.mfa_challenge_token);
    if (!adminUserId) {
      return res.status(401).json({ ok: false, error: 'Desafio expirado', code: 'MFA_CHALLENGE_EXPIRED' });
    }
    const verified = await adminMfa.verifyCode(adminUserId, body.code);
    if (!verified.ok) {
      return res.status(401).json({ ok: false, error: 'Código inválido', code: verified.code });
    }
    const r = await db.query(
      'SELECT id, nome, email, perfil, ativo FROM admin_users WHERE id = $1::uuid',
      [adminUserId]
    );
    const user = r.rows[0];
    if (!user?.ativo) {
      return res.status(403).json({ ok: false, error: 'Usuário inativo', code: 'ADMIN_INACTIVE' });
    }

    const trust = await deviceTrust.assertLoginAuthorized(user, req, {
      device_id: req.body?.device_id,
      device_label: req.body?.device_label
    });
    if (!trust.ok) {
      return res.status(403).json({
        ok: false,
        error: trust.error,
        code: trust.code,
        device_pending: !!trust.device_pending
      });
    }

    const token = signAdminToken(user);
    await logAdminAction({
      adminUserId: user.id,
      acao: 'login_mfa',
      entidade: 'auth',
      ip: req.ip,
      detalhes: { email: user.email }
    });
    return res.json({
      ok: true,
      token,
      user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil }
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Dados inválidos' });
    }
    console.error('[impetusAdmin/login/mfa-verify]', e);
    return res.status(500).json({ ok: false, error: 'Erro ao verificar MFA' });
  }
});

router.post('/mfa/enroll/begin', requireAdminAuth, async (req, res) => {
  if (!adminMfa.isEnabled()) {
    return res.status(403).json({ ok: false, code: 'ADMIN_MFA_DISABLED' });
  }
  const { secret, uri } = adminMfa.beginEnrollment(req.adminUser.email);
  await adminMfa.savePendingSecret(req.adminUser.id, secret);
  return res.json({ ok: true, otpauth_uri: uri, issuer: 'IMPETUS Equipa' });
});

router.post('/mfa/enroll/confirm', requireAdminAuth, async (req, res) => {
  const code = String(req.body?.code || '').trim();
  if (!code) return res.status(400).json({ ok: false, error: 'Código obrigatório' });
  const out = await adminMfa.confirmEnrollment(req.adminUser.id, code);
  if (!out.ok) return res.status(400).json(out);
  await logAdminAction({
    adminUserId: req.adminUser.id,
    acao: 'mfa_enrolled',
    entidade: 'auth',
    ip: req.ip
  });
  return res.json({ ok: true, message: '2FA activado para esta conta' });
});

router.get('/mfa/status', requireAdminAuth, async (req, res) => {
  const r = await db.query(
    'SELECT totp_enabled, totp_enrolled_at FROM admin_users WHERE id = $1::uuid',
    [req.adminUser.id]
  );
  const row = r.rows[0] || {};
  return res.json({
    ok: true,
    enabled: adminMfa.isEnabled(),
    totp_enabled: !!row.totp_enabled,
    enrolled_at: row.totp_enrolled_at
  });
});

router.post('/logout', requireAdminAuth, async (req, res) => {
  await logAdminAction({
    adminUserId: req.adminUser.id,
    acao: 'logout',
    entidade: 'auth',
    ip: req.ip
  });
  res.json({ ok: true });
});

router.get('/me', requireAdminAuth, async (req, res) => {
  res.json({ ok: true, user: req.adminUser });
});

module.exports = router;
