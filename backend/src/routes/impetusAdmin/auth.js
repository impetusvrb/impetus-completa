'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../../db');
const { signAdminToken, requireAdminAuth } = require('../../middleware/adminPortalAuth');
const { logAdminAction } = require('../../services/adminPortalLogService');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1)
});

router.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
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

    const token = signAdminToken(user);
    await logAdminAction({
      adminUserId: user.id,
      acao: 'login',
      entidade: 'auth',
      ip: req.ip,
      detalhes: { email: user.email }
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
