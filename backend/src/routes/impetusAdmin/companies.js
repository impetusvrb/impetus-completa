'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('../../db');
const {
  requireAdminAuth,
  requireAdminProfiles,
  requireCommercialOrSuper
} = require('../../middleware/adminPortalAuth');
const { logAdminAction } = require('../../services/adminPortalLogService');

const router = express.Router();

const TENANT_STATUSES = ['teste', 'ativo', 'suspenso', 'cancelado'];
const PLAN_TYPES = ['essencial', 'profissional', 'estratégico', 'enterprise'];

function sanitizeCnpj(v) {
  if (v == null || v === '') return null;
  const d = String(v).replace(/\D/g, '');
  return d.length === 14 ? d : null;
}

function mapCompany(row) {
  if (!row) return null;
  return {
    company_id: row.id,
    id: row.id,
    razao_social: row.razao_social || row.name,
    nome_fantasia: row.nome_fantasia,
    name: row.name,
    cnpj: row.cnpj,
    email_responsavel: row.email_responsavel,
    telefone_responsavel: row.telefone_responsavel,
    nome_responsavel: row.nome_responsavel,
    plano: row.plan_type || row.subscription_tier,
    plan_type: row.plan_type,
    subscription_tier: row.subscription_tier,
    quantidade_usuarios_contratados: row.quantidade_usuarios_contratados,
    tenant_status: row.tenant_status || 'ativo',
    data_inicio_contrato: row.contract_start_date,
    data_fim_contrato: row.contract_end_date,
    observacoes: row.observacoes_comercial,
    slug: row.slug,
    logo_url: row.logo_url,
    cor_tema: row.cor_tema,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by_admin_id: row.created_by_admin_id
  };
}

const createSchema = z.object({
  razao_social: z.string().min(2).max(300),
  nome_fantasia: z.string().max(300).optional().nullable(),
  cnpj: z.string().optional().nullable(),
  email_responsavel: z.string().email().optional().nullable(),
  telefone_responsavel: z.string().max(40).optional().nullable(),
  nome_responsavel: z.string().max(200).optional().nullable(),
  plano: z.enum(PLAN_TYPES).optional().default('essencial'),
  quantidade_usuarios_contratados: z.coerce.number().int().min(1).max(100000).optional().default(10),
  tenant_status: z.enum(TENANT_STATUSES).optional().default('teste'),
  data_inicio_contrato: z.string().optional().nullable(),
  data_fim_contrato: z.string().optional().nullable(),
  observacoes: z.string().max(20000).optional().nullable(),
  slug: z.string().max(120).regex(/^[a-z0-9-]*$/).optional().nullable(),
  logo_url: z.string().url().max(2000).optional().nullable().or(z.literal('')),
  cor_tema: z.string().max(32).optional().nullable()
});

const updateSchema = createSchema.partial().extend({
  razao_social: z.string().min(2).max(300).optional()
});

router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const q = (req.query.q || '').trim();
    const status = (req.query.status || '').trim();

    const conds = ['1=1'];
    const params = [];
    let i = 1;

    if (q) {
      const like = `%${q}%`;
      const digits = `%${q.replace(/\D/g, '')}%`;
      conds.push(
        `(c.name ILIKE $${i} OR c.razao_social ILIKE $${i} OR c.nome_fantasia ILIKE $${i} OR REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(c.cnpj,''),'.',''),'/',''),'-',''),' ','') LIKE $${i + 1} OR cast(c.id as text) ILIKE $${i + 2})`
      );
      params.push(like, digits, like);
      i += 3;
    }

    if (status && TENANT_STATUSES.includes(status)) {
      conds.push(
        `COALESCE(c.tenant_status, CASE WHEN c.active THEN 'ativo' ELSE 'suspenso' END) = $${i}`
      );
      params.push(status);
      i += 1;
    }

    const where = conds.join(' AND ');
    const countR = await db.query(`SELECT count(*)::int AS n FROM companies c WHERE ${where}`, params);
    const total = countR.rows[0].n;

    params.push(limit, offset);
    const listR = await db.query(
      `SELECT c.* FROM companies c WHERE ${where}
       ORDER BY c.created_at DESC NULLS LAST
       LIMIT $${i} OFFSET $${i + 1}`,
      params
    );

    res.json({
      ok: true,
      data: listR.rows.map(mapCompany),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
    });
  } catch (e) {
    console.error('[impetusAdmin/companies list]', e);
    res.status(500).json({ ok: false, error: 'Erro ao listar empresas' });
  }
});

router.get('/:id', requireAdminAuth, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM companies WHERE id = $1`, [req.params.id]);
    if (!r.rows.length) {
      return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    }
    res.json({ ok: true, company: mapCompany(r.rows[0]) });
  } catch (e) {
    console.error('[impetusAdmin/companies get]', e);
    res.status(500).json({ ok: false, error: 'Erro ao buscar empresa' });
  }
});

router.post('/', requireAdminAuth, requireCommercialOrSuper, async (req, res) => {
  try {
    const body = createSchema.parse(req.body);
    const cnpj = sanitizeCnpj(body.cnpj);
    if (body.cnpj && !cnpj) {
      return res.status(400).json({ ok: false, error: 'CNPJ inválido (use 14 dígitos)' });
    }

    if (cnpj) {
      const ex = await db.query(
        `SELECT id FROM companies WHERE REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(cnpj,''),'.',''),'/',''),'-',''),' ','') = $1`,
        [cnpj]
      );
      if (ex.rows.length) {
        return res.status(409).json({ ok: false, error: 'CNPJ já cadastrado', code: 'CNPJ_DUPLICATE' });
      }
    }

    const name = body.razao_social.trim();
    const plan = body.plano;
    const tenantStatus = body.tenant_status;
    const active = ['teste', 'ativo'].includes(tenantStatus);

    const ins = await db.query(
      `INSERT INTO companies (
        name, razao_social, nome_fantasia, cnpj,
        email_responsavel, telefone_responsavel, nome_responsavel,
        plan_type, subscription_tier, quantidade_usuarios_contratados,
        tenant_status, observacoes_comercial, slug, logo_url, cor_tema,
        active, contract_start_date, contract_end_date, created_by_admin_id
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19
      )
      RETURNING *`,
      [
        name,
        name,
        body.nome_fantasia || null,
        cnpj,
        body.email_responsavel || null,
        body.telefone_responsavel || null,
        body.nome_responsavel || null,
        plan,
        plan,
        body.quantidade_usuarios_contratados,
        tenantStatus,
        body.observacoes || null,
        (body.slug && String(body.slug).trim()) || null,
        body.logo_url || null,
        body.cor_tema || null,
        active,
        body.data_inicio_contrato || null,
        body.data_fim_contrato || null,
        req.adminUser.id
      ]
    );

    const row = ins.rows[0];
    await logAdminAction({
      adminUserId: req.adminUser.id,
      acao: 'empresa_criada',
      entidade: 'company',
      entidadeId: row.id,
      ip: req.ip,
      detalhes: { company_id: row.id, razao_social: name }
    });

    res.status(201).json({ ok: true, company: mapCompany(row) });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Validação', details: e.errors });
    }
    if (e.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Slug ou dado único duplicado' });
    }
    console.error('[impetusAdmin/companies create]', e);
    res.status(500).json({ ok: false, error: 'Erro ao criar empresa' });
  }
});

router.put('/:id', requireAdminAuth, requireCommercialOrSuper, async (req, res) => {
  try {
    const body = updateSchema.parse(req.body);
    const ex = await db.query(`SELECT * FROM companies WHERE id = $1`, [req.params.id]);
    if (!ex.rows.length) {
      return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    }
    const cur = ex.rows[0];

    let cnpj = cur.cnpj;
    if (body.cnpj !== undefined) {
      if (body.cnpj === null || body.cnpj === '') {
        cnpj = null;
      } else {
        cnpj = sanitizeCnpj(body.cnpj);
        if (!cnpj) {
          return res.status(400).json({ ok: false, error: 'CNPJ inválido (14 dígitos)' });
        }
      }
    }
    if (cnpj) {
      const clash = await db.query(
        `SELECT id FROM companies WHERE id <> $1 AND REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(cnpj,''),'.',''),'/',''),'-',''),' ','') = $2`,
        [req.params.id, cnpj]
      );
      if (clash.rows.length) {
        return res.status(409).json({ ok: false, error: 'CNPJ já cadastrado' });
      }
    }

    const razao = body.razao_social != null ? body.razao_social.trim() : cur.razao_social || cur.name;
    const plan = body.plano != null ? body.plano : cur.plan_type;
    const tenantStatus =
      body.tenant_status != null ? body.tenant_status : cur.tenant_status || (cur.active ? 'ativo' : 'suspenso');
    const active = ['teste', 'ativo'].includes(tenantStatus);

    const r = await db.query(
      `UPDATE companies SET
        name = $1,
        razao_social = $2,
        nome_fantasia = $3,
        cnpj = $4,
        email_responsavel = $5,
        telefone_responsavel = $6,
        nome_responsavel = $7,
        plan_type = $8,
        subscription_tier = $8,
        quantidade_usuarios_contratados = $9,
        tenant_status = $10,
        observacoes_comercial = $11,
        slug = $12,
        logo_url = $13,
        cor_tema = $14,
        active = $15,
        contract_start_date = $16,
        contract_end_date = $17,
        updated_at = now()
      WHERE id = $18
      RETURNING *`,
      [
        razao,
        razao,
        body.nome_fantasia !== undefined ? body.nome_fantasia : cur.nome_fantasia,
        cnpj,
        body.email_responsavel !== undefined ? body.email_responsavel : cur.email_responsavel,
        body.telefone_responsavel !== undefined ? body.telefone_responsavel : cur.telefone_responsavel,
        body.nome_responsavel !== undefined ? body.nome_responsavel : cur.nome_responsavel,
        plan,
        body.quantidade_usuarios_contratados != null ? body.quantidade_usuarios_contratados : cur.quantidade_usuarios_contratados,
        tenantStatus,
        body.observacoes !== undefined ? body.observacoes : cur.observacoes_comercial,
        body.slug !== undefined ? body.slug : cur.slug,
        body.logo_url !== undefined ? body.logo_url || null : cur.logo_url,
        body.cor_tema !== undefined ? body.cor_tema : cur.cor_tema,
        active,
        body.data_inicio_contrato !== undefined ? body.data_inicio_contrato : cur.contract_start_date,
        body.data_fim_contrato !== undefined ? body.data_fim_contrato : cur.contract_end_date,
        req.params.id
      ]
    );

    await logAdminAction({
      adminUserId: req.adminUser.id,
      acao: 'empresa_editada',
      entidade: 'company',
      entidadeId: req.params.id,
      ip: req.ip,
      detalhes: { campos: Object.keys(body) }
    });

    res.json({ ok: true, company: mapCompany(r.rows[0]) });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Validação', details: e.errors });
    }
    console.error('[impetusAdmin/companies put]', e);
    res.status(500).json({ ok: false, error: 'Erro ao atualizar empresa' });
  }
});

const statusSchema = z.object({ tenant_status: z.enum(TENANT_STATUSES) });

router.patch('/:id/status', requireAdminAuth, requireCommercialOrSuper, async (req, res) => {
  try {
    const { tenant_status } = statusSchema.parse(req.body);
    const active = ['teste', 'ativo'].includes(tenant_status);
    const r = await db.query(
      `UPDATE companies SET tenant_status = $1, active = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [tenant_status, active, req.params.id]
    );
    if (!r.rows.length) {
      return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    }
    await logAdminAction({
      adminUserId: req.adminUser.id,
      acao: 'empresa_status',
      entidade: 'company',
      entidadeId: req.params.id,
      ip: req.ip,
      detalhes: { tenant_status }
    });
    res.json({ ok: true, company: mapCompany(r.rows[0]) });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Validação', details: e.errors });
    }
    console.error('[impetusAdmin/companies status]', e);
    res.status(500).json({ ok: false, error: 'Erro ao alterar status' });
  }
});

/** Suporte: atualização limitada de contatos */
router.patch('/:id/contatos', requireAdminAuth, async (req, res) => {
  if (!['super_admin', 'admin_comercial', 'admin_suporte'].includes(req.adminUser.perfil)) {
    return res.status(403).json({ ok: false, error: 'Negado' });
  }
  try {
    const schema = z.object({
      email_responsavel: z.string().email().optional().nullable(),
      telefone_responsavel: z.string().max(40).optional().nullable(),
      nome_responsavel: z.string().max(200).optional().nullable(),
      observacoes: z.string().max(20000).optional().nullable()
    });
    const body = schema.parse(req.body);
    const cur = await db.query(`SELECT * FROM companies WHERE id = $1`, [req.params.id]);
    if (!cur.rows.length) {
      return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    }
    const c = cur.rows[0];
    const email_responsavel =
      body.email_responsavel !== undefined ? body.email_responsavel : c.email_responsavel;
    const telefone_responsavel =
      body.telefone_responsavel !== undefined ? body.telefone_responsavel : c.telefone_responsavel;
    const nome_responsavel =
      body.nome_responsavel !== undefined ? body.nome_responsavel : c.nome_responsavel;
    const observacoes =
      body.observacoes !== undefined ? body.observacoes : c.observacoes_comercial;

    const r = await db.query(
      `UPDATE companies SET
        email_responsavel = $1,
        telefone_responsavel = $2,
        nome_responsavel = $3,
        observacoes_comercial = $4,
        updated_at = now()
      WHERE id = $5
      RETURNING *`,
      [email_responsavel, telefone_responsavel, nome_responsavel, observacoes, req.params.id]
    );
    if (!r.rows.length) {
      return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    }
    await logAdminAction({
      adminUserId: req.adminUser.id,
      acao: 'empresa_contatos',
      entidade: 'company',
      entidadeId: req.params.id,
      ip: req.ip
    });
    res.json({ ok: true, company: mapCompany(r.rows[0]) });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Validação', details: e.errors });
    }
    console.error('[impetusAdmin/companies contatos]', e);
    res.status(500).json({ ok: false, error: 'Erro ao atualizar' });
  }
});

router.delete('/:id', requireAdminAuth, requireAdminProfiles('super_admin'), async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE companies SET tenant_status = 'cancelado', active = false, updated_at = now()
       WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!r.rows.length) {
      return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    }
    await logAdminAction({
      adminUserId: req.adminUser.id,
      acao: 'empresa_encerrada',
      entidade: 'company',
      entidadeId: req.params.id,
      ip: req.ip
    });
    res.json({ ok: true, message: 'Empresa marcada como cancelada (encerramento lógico)' });
  } catch (e) {
    console.error('[impetusAdmin/companies delete]', e);
    res.status(500).json({ ok: false, error: 'Erro ao encerrar empresa' });
  }
});

module.exports = router;
