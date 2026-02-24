/**
 * ROTAS INTERNAS - EQUIPE COMERCIAL
 * Apenas role = internal_admin
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const { hashPassword } = require('../../middleware/auth');
const { logAction } = require('../../middleware/audit');
const { generateSecurePassword, sendActivationEmail } = require('../../services/emailService');
const { activateCompanySubscription } = require('../../services/asaasService');
const { z } = require('zod');

const activateSchema = z.object({
  company_name: z.string().min(2).max(120),
  cnpj: z.string().optional(),
  contact_name: z.string().min(3).max(100),
  contact_email: z.string().email(),
  plan_type: z.enum(['essencial', 'profissional', 'estratégico', 'enterprise']).default('essencial')
});

/**
 * POST /api/internal/sales/activate-client
 * Ativa cliente comercialmente - cria usuário provisório e envia email
 */
router.post('/activate-client', async (req, res) => {
  try {
    const parsed = activateSchema.parse(req.body);

    const cnpjClean = (parsed.cnpj || '').replace(/\D/g, '');
    if (cnpjClean && cnpjClean.length !== 14) {
      return res.status(400).json({ ok: false, error: 'CNPJ inválido (14 dígitos)' });
    }

    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [parsed.contact_email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        ok: false,
        error: 'Email já cadastrado',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    const temporaryPassword = generateSecurePassword(10);
    const passwordHash = hashPassword(temporaryPassword);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const r = await db.query(`
      INSERT INTO users (
        name, email, password_hash, role,
        area, hierarchy_level, job_title, department, company_id,
        is_first_access, temporary_password_expires_at, must_change_password, active
      ) VALUES ($1, $2, $3, 'diretor', 'Direção', 1, 'CEO', NULL, NULL, true, $4, true, true)
      RETURNING id, name, email, is_first_access, temporary_password_expires_at
    `, [parsed.contact_name, parsed.contact_email.toLowerCase(), passwordHash, expiresAt]);

    const user = r.rows[0];

    const emailResult = await sendActivationEmail({
      to: parsed.contact_email,
      contactName: parsed.contact_name,
      login: parsed.contact_email,
      temporaryPassword,
      companyName: parsed.company_name
    });

    await logAction({
      companyId: req.user?.company_id,
      userId: req.user?.id,
      action: 'commercial_activation',
      entityType: 'user',
      entityId: user.id,
      description: `Cliente ativado: ${parsed.contact_email} - ${parsed.company_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'info',
      success: true
    });

    res.status(201).json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_first_access: user.is_first_access
      },
      emailSent: emailResult.sent,
      message: emailResult.sent
        ? 'Cliente ativado. Email com credenciais enviado.'
        : 'Cliente ativado. Configure SMTP para envio automático ou envie as credenciais manualmente.',
      _internalTempPassword: emailResult.sent ? undefined : temporaryPassword
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Dados inválidos', details: err.errors });
    }
    console.error('[ACTIVATE_CLIENT_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao ativar cliente' });
  }
});

const activateSubscriptionSchema = z.object({
  company_id: z.string().uuid(),
  plan_type: z.enum(['essencial', 'profissional', 'estratégico', 'enterprise']).default('profissional')
});

/**
 * POST /api/internal/sales/activate-subscription
 * Cria assinatura recorrente no Asaas e marca company como pending até pagamento
 */
router.post('/activate-subscription', async (req, res) => {
  try {
    const parsed = activateSubscriptionSchema.parse(req.body);
    const companyRes = await db.query(
      'SELECT id, name FROM companies WHERE id = $1',
      [parsed.company_id]
    );
    if (companyRes.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    }

    const result = await activateCompanySubscription(parsed.company_id, parsed.plan_type);

    await logAction({
      companyId: req.user?.company_id,
      userId: req.user?.id,
      action: 'subscription_activated',
      entityType: 'subscription',
      entityId: parsed.company_id,
      description: `Assinatura Asaas criada para ${companyRes.rows[0].name} - plano ${parsed.plan_type}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'info',
      success: true
    });

    res.status(201).json({
      ok: true,
      message: 'Assinatura criada no Asaas. Empresa aguardando confirmação do primeiro pagamento.',
      asaas_customer_id: result.customer?.id,
      asaas_subscription_id: result.subscription?.id,
      billing_type: result.subscription?.billingType || 'BOLETO'
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Dados inválidos', details: err.errors });
    }
    if (err.message?.includes('ASAAS_API_KEY')) {
      return res.status(503).json({ ok: false, error: 'Integração Asaas não configurada. Configure ASAAS_API_KEY.' });
    }
    console.error('[ACTIVATE_SUBSCRIPTION_ERROR]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao ativar assinatura' });
  }
});

module.exports = router;
