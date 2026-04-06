'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../../db');
const { requireAdminAuth, requireAdminProfiles } = require('../../middleware/adminPortalAuth');
const { logAdminAction } = require('../../services/adminPortalLogService');

const router = express.Router();

const profiles = z.enum(['super_admin', 'admin_comercial', 'admin_suporte']);

router.get('/', requireAdminAuth, requireAdminProfiles('super_admin'), async (_req, res) => {
  try {
    const r = await db.query(
      `SELECT id, nome, email, perfil, ativo, created_at, updated_at, last_login_at
       FROM admin_users ORDER BY created_at ASC`
    );
    res.json({ ok: true, data: r.rows });
  } catch (e) {
    console.error('[impetusAdmin/users list]', e);
    res.status(500).json({ ok: false, error: 'Erro ao listar usuários' });
  }
});

const createUserSchema = z.object({
  nome: z.string().min(2).max(200),
  email: z.string().email(),
  senha: z.string().min(6).max(200),
  perfil: profiles
});

router.post('/', requireAdminAuth, requireAdminProfiles('super_admin'), async (req, res) => {
  try {
    const body = createUserSchema.parse(req.body);
    const email = body.email.trim().toLowerCase();
    const hash = bcrypt.hashSync(body.senha, 12);
    const r = await db.query(
      `INSERT INTO admin_users (nome, email, senha_hash, perfil)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, email, perfil, ativo, created_at`,
      [body.nome.trim(), email, hash, body.perfil]
    );
    await logAdminAction({
      adminUserId: req.adminUser.id,
      acao: 'admin_usuario_criado',
      entidade: 'admin_user',
      entidadeId: r.rows[0].id,
      ip: req.ip,
      detalhes: { email }
    });
    res.status(201).json({ ok: true, user: r.rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Validação', details: e.errors });
    }
    if (e.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Email já cadastrado' });
    }
    console.error('[impetusAdmin/users create]', e);
    res.status(500).json({ ok: false, error: 'Erro ao criar usuário' });
  }
});

const updateUserSchema = z.object({
  nome: z.string().min(2).max(200).optional(),
  email: z.string().email().optional(),
  senha: z.string().min(6).max(200).optional(),
  perfil: profiles.optional()
});

router.put('/:id', requireAdminAuth, requireAdminProfiles('super_admin'), async (req, res) => {
  try {
    const body = updateUserSchema.parse(req.body);
    const cur = await db.query(`SELECT * FROM admin_users WHERE id = $1`, [req.params.id]);
    if (!cur.rows.length) {
      return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
    }
    const u = cur.rows[0];
    const nome = body.nome != null ? body.nome.trim() : u.nome;
    const email = body.email != null ? body.email.trim().toLowerCase() : u.email;
    let senhaHash = u.senha_hash;
    if (body.senha) {
      senhaHash = bcrypt.hashSync(body.senha, 12);
    }
    const perfil = body.perfil != null ? body.perfil : u.perfil;

    const r = await db.query(
      `UPDATE admin_users SET nome = $1, email = $2, senha_hash = $3, perfil = $4, updated_at = now()
       WHERE id = $5
       RETURNING id, nome, email, perfil, ativo, created_at, updated_at, last_login_at`,
      [nome, email, senhaHash, perfil, req.params.id]
    );
    await logAdminAction({
      adminUserId: req.adminUser.id,
      acao: 'admin_usuario_editado',
      entidade: 'admin_user',
      entidadeId: req.params.id,
      ip: req.ip
    });
    res.json({ ok: true, user: r.rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Validação', details: e.errors });
    }
    if (e.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Email já cadastrado' });
    }
    console.error('[impetusAdmin/users put]', e);
    res.status(500).json({ ok: false, error: 'Erro ao atualizar' });
  }
});

router.patch('/:id/active', requireAdminAuth, requireAdminProfiles('super_admin'), async (req, res) => {
  try {
    const { ativo } = z.object({ ativo: z.boolean() }).parse(req.body);
    if (req.params.id === req.adminUser.id && !ativo) {
      return res.status(400).json({ ok: false, error: 'Não pode desativar a si mesmo' });
    }
    const r = await db.query(
      `UPDATE admin_users SET ativo = $1, updated_at = now() WHERE id = $2 RETURNING id, ativo`,
      [ativo, req.params.id]
    );
    if (!r.rows.length) {
      return res.status(404).json({ ok: false, error: 'Não encontrado' });
    }
    await logAdminAction({
      adminUserId: req.adminUser.id,
      acao: ativo ? 'admin_usuario_ativado' : 'admin_usuario_desativado',
      entidade: 'admin_user',
      entidadeId: req.params.id,
      ip: req.ip
    });
    res.json({ ok: true, user: r.rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Validação', details: e.errors });
    }
    console.error('[impetusAdmin/users active]', e);
    res.status(500).json({ ok: false, error: 'Erro' });
  }
});

module.exports = router;
