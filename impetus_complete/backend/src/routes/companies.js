/**
 * ROTAS DE EMPRESAS (Multi-Tenant)
 * Criação de empresa + administrador inicial
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword, createSession } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const { z } = require('zod');

const createCompanySchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(120),
  cnpj: z.preprocess(v => (v === '' || v == null ? undefined : v), z.string().regex(/^\d{14}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido').optional()),
  plan_type: z.enum(['essencial', 'profissional', 'estratégico', 'enterprise']).default('essencial'),
  admin_name: z.string().min(3, 'Nome do administrador obrigatório').max(100),
  admin_email: z.string().email('Email inválido'),
  admin_password: z.string().min(8, 'Senha mínima 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha deve ter maiúscula, minúscula e número')
});

/**
 * POST /api/companies
 * Cria nova empresa + usuário administrador inicial (CEO/Direção)
 * Rota pública para onboarding
 */
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const parsed = createCompanySchema.parse({
      ...req.body,
      cnpj: req.body.cnpj || ''
    });

    const cnpjClean = (parsed.cnpj || '').replace(/\D/g, '');
    if (cnpjClean && cnpjClean.length !== 14) {
      return res.status(400).json({ ok: false, error: 'CNPJ deve ter 14 dígitos' });
    }

    const existingEmail = await db.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [parsed.admin_email.toLowerCase()]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({
        ok: false,
        error: 'Email já cadastrado em outra conta',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    if (cnpjClean) {
      const existingCnpj = await db.query(
        'SELECT id FROM companies WHERE cnpj IS NOT NULL AND REPLACE(REPLACE(REPLACE(REPLACE(cnpj, \'.\', \'\'), \'/\', \'\'), \'-\', \'\'), \' \', \'\') = $1',
        [cnpjClean]
      );
      if (existingCnpj.rows.length > 0) {
        return res.status(409).json({
          ok: false,
          error: 'CNPJ já cadastrado',
          code: 'CNPJ_ALREADY_EXISTS'
        });
      }
    }

    await client.query('BEGIN');

    const companyResult = await client.query(`
      INSERT INTO companies (name, cnpj, plan_type, subscription_tier, active)
      VALUES ($1, $2, $3, $3, true)
      RETURNING id, name, plan_type, created_at
    `, [parsed.name, cnpjClean || null, parsed.plan_type]);

    const company = companyResult.rows[0];
    const companyId = company.id;

    const passwordHash = hashPassword(parsed.admin_password);
    const userResult = await client.query(`
      INSERT INTO users (
        company_id, name, email, password_hash, role,
        area, hierarchy_level, active
      ) VALUES ($1, $2, $3, $4, 'diretor', 'Direção', 1, true)
      RETURNING id, name, email, role, hierarchy_level, area
    `, [companyId, parsed.admin_name, parsed.admin_email.toLowerCase(), passwordHash]);

    const admin = userResult.rows[0];

    await client.query('COMMIT');

    const session = await createSession(
      admin.id,
      req.ip,
      req.get('user-agent')
    );

    await logAction({
      companyId: companyId,
      userId: admin.id,
      action: 'company_created',
      entityType: 'company',
      entityId: companyId,
      description: `Empresa ${company.name} criada. Admin: ${admin.email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
      success: true
    });

    res.status(201).json({
      ok: true,
      company: {
        id: company.id,
        name: company.name,
        plan_type: company.plan_type
      },
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        hierarchy_level: admin.hierarchy_level,
        area: admin.area
      },
      token: session.token,
      expiresAt: session.expiresAt,
      message: 'Empresa criada. Faça login com o email e senha informados.'
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        error: 'Dados inválidos',
        details: err.errors
      });
    }
    console.error('[CREATE_COMPANY_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao criar empresa. Tente novamente.'
    });
  } finally {
    client.release();
  }
});

module.exports = router;
