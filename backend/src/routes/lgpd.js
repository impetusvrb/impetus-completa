/**
 * ROTAS DE LGPD
 * Consentimentos, Solicitações de Dados, Exportação, Anonimização
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireHierarchy } = require('../middleware/auth');
const { isValidUUID } = require('../utils/security');
const {
  registerConsent,
  revokeConsent,
  exportUserData,
  anonymizeUserData,
  processDataRequest
} = require('../middleware/lgpd');
const { logAction, logDataAccess } = require('../middleware/audit');

/**
 * POST /api/lgpd/consent
 * Registrar consentimento
 */
router.post('/consent', requireAuth, async (req, res) => {
  try {
    const { consent_type, granted, consent_text, document_version } = req.body;

    const reg = await registerConsent({
      userId: req.user.id,
      companyId: req.user.company_id,
      consentType: consent_type,
      granted,
      consentText: consent_text,
      version: document_version || '1.0',
      documentVersion: document_version || '1.0',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    if (!reg.ok) {
      return res.status(500).json({
        ok: false,
        error: 'Não foi possível persistir o consentimento. Verifique se a migração LGPD foi aplicada.'
      });
    }

    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'consent_registered',
      description: `Consentimento ${granted ? 'concedido' : 'negado'} para ${consent_type}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      ok: true,
      message: 'Consentimento registrado'
    });

  } catch (err) {
    console.error('[REGISTER_CONSENT_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao registrar consentimento'
    });
  }
});

/**
 * DELETE /api/lgpd/consent/:type
 * Revogar consentimento
 */
router.delete('/consent/:type', requireAuth, async (req, res) => {
  try {
    const rev = await revokeConsent(req.user.id, req.params.type);
    if (!rev.ok) {
      return res.status(500).json({
        ok: false,
        error: rev.error || 'Erro ao revogar consentimento'
      });
    }

    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'consent_revoked',
      description: `Consentimento revogado para ${req.params.type}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'warning'
    });

    res.json({
      ok: true,
      message: 'Consentimento revogado'
    });

  } catch (err) {
    console.error('[REVOKE_CONSENT_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao revogar consentimento'
    });
  }
});

/**
 * GET /api/lgpd/my-data
 * Exportar todos os dados do usuário (LGPD Art. 18 - Portabilidade)
 */
router.get('/my-data', requireAuth, async (req, res) => {
  try {
    const data = await exportUserData(req.user.id);

    await logDataAccess({
      companyId: req.user.company_id,
      accessedBy: req.user.id,
      accessedByName: req.user.name,
      entityType: 'user',
      entityId: req.user.id,
      action: 'export',
      justification: 'Solicitação de portabilidade de dados (LGPD Art. 18)',
      containsSensitiveData: true,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      sessionId: req.session.id
    });

    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'data_export',
      description: 'Exportação de dados pessoais realizada',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info'
    });

    res.json({
      ok: true,
      data
    });

  } catch (err) {
    console.error('[EXPORT_DATA_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao exportar dados'
    });
  }
});

/**
 * POST /api/lgpd/data-request
 * Criar solicitação de dados (acesso, correção, exclusão, etc)
 */
router.post('/data-request', requireAuth, async (req, res) => {
  try {
    const { request_type, description } = req.body;

    const validTypes = ['access', 'correction', 'deletion', 'portability', 'objection'];
    if (!validTypes.includes(request_type)) {
      return res.status(400).json({
        ok: false,
        error: 'Tipo de solicitação inválido'
      });
    }

    // Calcular deadline (15 dias úteis pela LGPD)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 21); // ~15 dias úteis

    const result = await db.query(`
      INSERT INTO lgpd_data_requests (
        company_id, user_id, request_type, description, deadline
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, request_type, status, created_at, deadline
    `, [req.user.company_id, req.user.id, request_type, description, deadline]);

    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'lgpd_request_created',
      entityType: 'lgpd_data_request',
      entityId: result.rows[0].id,
      description: `Solicitação LGPD criada: ${request_type}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'warning'
    });

    res.status(201).json({
      ok: true,
      request: result.rows[0],
      message: 'Solicitação registrada. Você receberá uma resposta em até 15 dias úteis.'
    });

  } catch (err) {
    console.error('[CREATE_DATA_REQUEST_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao criar solicitação'
    });
  }
});

/**
 * GET /api/lgpd/data-requests
 * Listar solicitações do usuário
 */
router.get('/data-requests', requireAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, request_type, description, status, 
             response, created_at, processed_at, deadline
      FROM lgpd_data_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({
      ok: true,
      requests: result.rows
    });

  } catch (err) {
    console.error('[GET_DATA_REQUESTS_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar solicitações'
    });
  }
});

/**
 * PATCH /api/lgpd/data-requests/:id
 * Atualiza estado do pedido LGPD (ex.: processing → completed). Uso: gestão/DPO na mesma empresa.
 */
router.patch('/data-requests/:id', requireAuth, requireHierarchy(1), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'ID inválido' });
    }
    const { status, response } = req.body || {};
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ ok: false, error: 'Campo status é obrigatório' });
    }
    const proc = await processDataRequest({
      requestId: req.params.id,
      companyId: req.user.company_id,
      status: status.toLowerCase(),
      response: response != null ? String(response) : null
    });
    if (!proc.ok) {
      const code = proc.error === 'request_not_found' ? 404 : 400;
      return res.status(code).json({ ok: false, error: proc.error || 'Falha ao atualizar pedido' });
    }
    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'lgpd_request_status_updated',
      entityType: 'lgpd_data_request',
      entityId: req.params.id,
      description: `Pedido LGPD atualizado para ${status}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info'
    });
    res.json({ ok: true, request: proc.request });
  } catch (err) {
    console.error('[LGPD_PATCH_REQUEST]', err);
    res.status(500).json({ ok: false, error: 'Erro ao atualizar solicitação' });
  }
});

/**
 * POST /api/lgpd/anonymize-user/:userId
 * Execução técnica do direito ao esquecimento (após análise jurídica). Apenas hierarquia ≤ 1 na mesma empresa.
 */
router.post('/anonymize-user/:userId', requireAuth, requireHierarchy(1), async (req, res) => {
  try {
    if (!isValidUUID(req.params.userId)) {
      return res.status(400).json({ ok: false, error: 'ID inválido' });
    }
    if (req.body?.confirmation !== 'CONFIRMO ANONIMIZACAO LGPD') {
      return res.status(400).json({
        ok: false,
        error: 'Confirmação obrigatória: envie confirmation: "CONFIRMO ANONIMIZACAO LGPD"'
      });
    }
    if (String(req.params.userId) === String(req.user.id)) {
      return res.status(400).json({ ok: false, error: 'Use o fluxo de solicitação para a própria conta' });
    }
    const anon = await anonymizeUserData(req.params.userId, {
      companyId: req.user.company_id,
      actingUserId: req.user.id
    });
    if (!anon.ok) {
      const code = anon.error === 'user_not_found' ? 404 : anon.error === 'company_mismatch' ? 403 : 400;
      return res.status(code).json({ ok: false, error: anon.error || 'Falha na anonimização' });
    }
    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'lgpd_user_anonymized',
      entityType: 'user',
      entityId: req.params.userId,
      description: `Titular anonimizado: ${anon.anonymized_label}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'critical'
    });
    res.json({ ok: true, message: 'Titular anonimizado com sucesso', label: anon.anonymized_label });
  } catch (err) {
    console.error('[LGPD_ANONYMIZE_ROUTE]', err);
    res.status(500).json({ ok: false, error: 'Erro ao anonimizar titular' });
  }
});

/**
 * DELETE /api/lgpd/delete-my-account
 * Solicitar exclusão completa da conta (LGPD Art. 18)
 */
router.delete('/delete-my-account', requireAuth, async (req, res) => {
  try {
    const { confirmation } = req.body;

    if (confirmation !== 'CONFIRMO A EXCLUSÃO') {
      return res.status(400).json({
        ok: false,
        error: 'Confirmação necessária para excluir conta'
      });
    }

    // Criar solicitação de exclusão
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 21);

    await db.query(`
      INSERT INTO lgpd_data_requests (
        company_id, user_id, request_type, description, deadline
      ) VALUES ($1, $2, 'deletion', 'Solicitação de exclusão completa da conta', $3)
    `, [req.user.company_id, req.user.id, deadline]);

    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'account_deletion_requested',
      description: 'Solicitação de exclusão de conta',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'critical'
    });

    res.json({
      ok: true,
      message: 'Solicitação de exclusão registrada. Sua conta será processada em até 15 dias úteis.'
    });

  } catch (err) {
    console.error('[DELETE_ACCOUNT_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao processar solicitação de exclusão'
    });
  }
});

module.exports = router;
