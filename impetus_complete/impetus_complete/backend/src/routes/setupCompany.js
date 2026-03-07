/**
 * ROTA DE SETUP DA EMPRESA
 * Cliente em primeiro acesso completa cadastro da empresa
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const { z } = require('zod');

const setupSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório').max(120),
  cnpj: z.string().optional(),
  industry_segment: z.string().max(200).optional(),
  industry_type: z.string().max(200).optional(),
  initial_areas_count: z.coerce.number().int().min(1).max(20).default(5)
});

/**
 * POST /api/setup-company
 * Cria empresa e vincula ao usuário (primeiro acesso)
 */
router.post('/', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Não autenticado' });
    }

    if (user.company_id && !user.is_first_access) {
      return res.status(400).json({
        ok: false,
        error: 'Empresa já configurada',
        code: 'ALREADY_SETUP'
      });
    }

    const parsed = setupSchema.parse(req.body);
    const cnpjClean = (parsed.cnpj || '').replace(/\D/g, '');

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const companyResult = await client.query(`
        INSERT INTO companies (
          name, cnpj, plan_type, subscription_tier,
          industry_segment, industry_type, initial_areas_count, active
        )
        VALUES ($1, $2, 'essencial', 'essencial', $3, $4, $5, true)
        RETURNING id, name, cnpj, plan_type
      `, [
        parsed.name,
        cnpjClean || null,
        parsed.industry_segment || null,
        parsed.industry_type || null,
        parsed.initial_areas_count || 5
      ]);

      const company = companyResult.rows[0];

      await client.query(`
        UPDATE users
        SET company_id = $1, is_first_access = false, must_change_password = false,
            temporary_password_expires_at = NULL, updated_at = now()
        WHERE id = $2
      `, [company.id, user.id]);

      await client.query('COMMIT');

      await logAction({
        companyId: company.id,
        userId: user.id,
        action: 'company_setup_completed',
        entityType: 'company',
        entityId: company.id,
        description: `Empresa ${company.name} configurada por ${user.email}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'info',
        success: true
      });

      res.json({
        ok: true,
        company: {
          id: company.id,
          name: company.name,
          plan_type: company.plan_type
        },
        message: 'Empresa configurada. Redirecionando...'
      });

    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Dados inválidos', details: err.errors });
    }
    console.error('[SETUP_COMPANY_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao configurar empresa' });
  }
});

/**
 * POST /api/setup-company/change-password
 * Força troca de senha no primeiro acesso
 */
router.post('/change-password', async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ ok: false, error: 'Não autenticado' });

    const { new_password } = req.body;
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({
        ok: false,
        error: 'Senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula e número'
      });
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(new_password)) {
      return res.status(400).json({
        ok: false,
        error: 'Senha deve conter maiúscula, minúscula e número'
      });
    }

    const { hashPassword } = require('../middleware/auth');
    const hash = hashPassword(new_password);

    await db.query(`
      UPDATE users
      SET password_hash = $1, must_change_password = false,
          temporary_password_expires_at = NULL, updated_at = now()
      WHERE id = $2
    `, [hash, user.id]);

    res.json({ ok: true, message: 'Senha alterada com sucesso' });

  } catch (err) {
    console.error('[CHANGE_PASSWORD_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao alterar senha' });
  }
});

module.exports = router;
