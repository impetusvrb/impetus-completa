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

// ═══════════════════════════════════════════════════════════════════════════════
// DSR EXPORT v3 — Enterprise-grade (Art. 18, II LGPD)
// Approval flow: SUBMIT → PENDING → APPROVED → EXECUTED
// Flag: IMPETUS_DSR_EXPORT=off|on
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/lgpd/subject/me/export
 * Submete pedido de exportação de dados do titular.
 * Cria request PENDING — não executa imediatamente (deny-first).
 */
router.get('/subject/me/export', requireAuth, async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || `dsr_exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const dsrExport = require('../services/dsrExportService');

    if (!dsrExport.isDsrExportEnabled()) {
      return res.status(503).json({
        ok: false,
        error: 'DSR Export is currently disabled',
        code: 'DSR_DISABLED',
        _meta: { correlation_id: correlationId },
      });
    }

    const userId = req.user.id;
    const companyId = req.user.company_id;

    if (!companyId) {
      return res.status(403).json({ ok: false, error: 'Tenant isolation required', code: 'NO_TENANT', _meta: { correlation_id: correlationId } });
    }

    const result = await dsrExport.submitExportRequest(userId, companyId, {
      correlationId,
      reason: req.query.reason || null,
    });

    if (!result.ok) {
      const status = result.code === 'USER_NOT_FOUND' ? 404
        : result.code === 'DUPLICATE_REQUEST' ? 409
        : 400;
      return res.status(status).json({ ...result, _meta: { correlation_id: correlationId } });
    }

    await logAction({
      companyId,
      userId,
      userName: req.user.name,
      action: 'dsr_export_submitted',
      entityType: 'lgpd_data_request',
      entityId: result.request.id,
      description: `DSR Export submitted — SLA ${dsrExport.SLA_DAYS} dias — awaiting approval`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'warning',
    });

    try {
      const apm = require('../observability/apmEnterpriseBridge');
      apm.recordLgpdEvent('dsr_export_submitted', { company_id: companyId });
    } catch { /* non-blocking */ }

    // Non-blocking notifications
    const dsrNotify = require('../services/dsrNotificationService');
    dsrNotify.notify({ userId, companyId, type: dsrNotify.DSR_NOTIFICATION_TYPES.EXPORT_SUBMITTED, requestId: result.request.id }).catch(() => {});
    dsrNotify.notifyDpoTeam({ companyId, type: dsrNotify.DSR_NOTIFICATION_TYPES.EXPORT_SUBMITTED, requestId: result.request.id, subjectName: req.user.name }).catch(() => {});

    res.status(202).json({ ...result, _meta: { correlation_id: correlationId } });
  } catch (err) {
    console.error('[DSR_EXPORT_SUBMIT]', err);
    res.status(500).json({ ok: false, error: 'Internal error', code: 'INTERNAL_ERROR', _meta: { correlation_id: correlationId } });
  }
});

/**
 * GET /api/lgpd/subject/me/export/status
 * Consulta status do pedido de exportação do titular.
 */
router.get('/subject/me/export/status', requireAuth, async (req, res) => {
  try {
    const dsrExport = require('../services/dsrExportService');
    const result = await dsrExport.getExportStatus(req.user.id, req.user.company_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

/**
 * POST /api/lgpd/subject/export/:id/approve
 * Aprova pedido de exportação (DPO / hierarchy ≤ 1).
 */
router.post('/subject/export/:id/approve', requireAuth, requireHierarchy(1), async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || `dsr_approve_${Date.now()}`;

  try {
    const dsrExport = require('../services/dsrExportService');

    if (!dsrExport.isDsrExportEnabled()) {
      return res.status(503).json({ ok: false, error: 'DSR Export disabled', code: 'DSR_DISABLED' });
    }

    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'Invalid request ID' });
    }

    const result = await dsrExport.approveExportRequest(
      req.params.id,
      req.user.company_id,
      req.user.id
    );

    if (!result.ok) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json(result);
    }

    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'dsr_export_approved',
      entityType: 'lgpd_data_request',
      entityId: req.params.id,
      description: 'DSR Export request approved by DPO/admin',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'warning',
    });

    // Non-blocking notification to subject
    const dsrNotifyApprove = require('../services/dsrNotificationService');
    const reqData = await db.query('SELECT user_id FROM lgpd_data_requests WHERE id = $1', [req.params.id]).catch(() => ({ rows: [] }));
    if (reqData.rows[0]?.user_id) {
      dsrNotifyApprove.notify({ userId: reqData.rows[0].user_id, companyId: req.user.company_id, type: dsrNotifyApprove.DSR_NOTIFICATION_TYPES.EXPORT_APPROVED, requestId: req.params.id }).catch(() => {});
    }

    res.json({ ...result, _meta: { correlation_id: correlationId } });
  } catch (err) {
    console.error('[DSR_EXPORT_APPROVE]', err);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

/**
 * POST /api/lgpd/subject/export/:id/execute
 * Executa exportação aprovada (DPO / hierarchy ≤ 1).
 * Colecta todos os dados do titular e retorna JSON estruturado.
 */
router.post('/subject/export/:id/execute', requireAuth, requireHierarchy(1), async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || `dsr_exec_${Date.now()}`;

  try {
    const dsrExport = require('../services/dsrExportService');

    if (!dsrExport.isDsrExportEnabled()) {
      return res.status(503).json({ ok: false, error: 'DSR Export disabled', code: 'DSR_DISABLED' });
    }

    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'Invalid request ID' });
    }

    const result = await dsrExport.executeExportRequest(req.params.id, req.user.company_id);

    if (!result.ok) {
      const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'NOT_APPROVED' ? 403 : 400;
      return res.status(status).json(result);
    }

    await logDataAccess({
      companyId: req.user.company_id,
      accessedBy: req.user.id,
      accessedByName: req.user.name,
      entityType: 'user',
      entityId: result.export?.manifest?.subject?.user_id || req.params.id,
      action: 'dsr_export_v3_executed',
      justification: 'DSR Export — Art. 18, II LGPD — Acesso e portabilidade',
      containsSensitiveData: true,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      sessionId: req.session?.id,
    });

    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'dsr_export_executed',
      entityType: 'lgpd_data_request',
      entityId: req.params.id,
      description: `DSR Export executed: ${result.export?.manifest?.metadata?.total_records || 0} registos em ${result.export?.manifest?.metadata?.sections_count || 0} secções`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'critical',
    });

    // Non-blocking notification
    const dsrNotifyExec = require('../services/dsrNotificationService');
    const subjectId = result.export?.manifest?.subject?.user_id;
    if (subjectId) {
      dsrNotifyExec.notify({ userId: subjectId, companyId: req.user.company_id, type: dsrNotifyExec.DSR_NOTIFICATION_TYPES.EXPORT_EXECUTED, requestId: req.params.id }).catch(() => {});
    }

    res.json({ ...result, _meta: { correlation_id: correlationId } });
  } catch (err) {
    console.error('[DSR_EXPORT_EXECUTE]', err);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

/**
 * GET /api/lgpd/my-data
 * Exportar todos os dados do usuário (LGPD Art. 18 - Portabilidade)
 * @deprecated — usar /api/lgpd/subject/me/export (DSR v2)
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

// ═══════════════════════════════════════════════════════════════════════════════
// DSR ERASE v2 — Enterprise-grade (Art. 18, VI LGPD)
// Flag: IMPETUS_DSR_ERASE=off|on
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/lgpd/subject/me/erase
 * Submete pedido de erasure (direito ao esquecimento).
 * Não executa imediatamente — cria request para approval flow assíncrono.
 */
router.post('/subject/me/erase', requireAuth, async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || `dsr_erase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const dsrErase = require('../services/dsrEraseService');

    if (!dsrErase.isDsrEraseEnabled()) {
      return res.status(503).json({
        ok: false,
        error: 'DSR Erase is currently disabled',
        code: 'DSR_ERASE_DISABLED',
        _meta: { correlation_id: correlationId },
      });
    }

    const userId = req.user.id;
    const companyId = req.user.company_id;

    if (!companyId) {
      return res.status(403).json({ ok: false, error: 'Tenant isolation required', code: 'NO_TENANT' });
    }

    const result = await dsrErase.submitEraseRequest(userId, companyId, {
      correlationId,
      reason: req.body?.reason || null,
      confirmation: req.body?.confirmation || null,
    });

    if (!result.ok) {
      const code = result.code === 'USER_NOT_FOUND' ? 404
        : result.code === 'DUPLICATE_REQUEST' ? 409
        : result.code === 'STRICT_CONFIRMATION_REQUIRED' ? 400
        : 400;
      return res.status(code).json({ ...result, _meta: { correlation_id: correlationId } });
    }

    await logAction({
      companyId,
      userId,
      userName: req.user.name,
      action: 'dsr_erase_requested',
      entityType: 'lgpd_data_request',
      entityId: result.request.id,
      description: `DSR Erase submitted — SLA ${dsrErase.SLA_DAYS} dias — awaiting approval`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'critical',
    });

    // Non-blocking notifications
    const dsrNotifyErase = require('../services/dsrNotificationService');
    dsrNotifyErase.notify({ userId, companyId, type: dsrNotifyErase.DSR_NOTIFICATION_TYPES.ERASE_SUBMITTED, requestId: result.request.id }).catch(() => {});
    dsrNotifyErase.notifyDpoTeam({ companyId, type: dsrNotifyErase.DSR_NOTIFICATION_TYPES.ERASE_SUBMITTED, requestId: result.request.id, subjectName: req.user.name }).catch(() => {});

    res.status(202).json({ ...result, _meta: { correlation_id: correlationId } });
  } catch (err) {
    console.error('[DSR_ERASE_ROUTE]', err);
    res.status(500).json({ ok: false, error: 'Internal error', code: 'INTERNAL_ERROR', _meta: { correlation_id: correlationId } });
  }
});

/**
 * GET /api/lgpd/subject/me/erase/status
 * Consulta status do pedido de erasure do titular.
 */
router.get('/subject/me/erase/status', requireAuth, async (req, res) => {
  try {
    const dsrErase = require('../services/dsrEraseService');
    const result = await dsrErase.getEraseStatus(req.user.id, req.user.company_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

/**
 * POST /api/lgpd/subject/erase/:requestId/approve
 * Aprova pedido de erasure (DPO / hierarchy ≤ 1).
 */
router.post('/subject/erase/:requestId/approve', requireAuth, requireHierarchy(1), async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || `dsr_approve_${Date.now()}`;

  try {
    const dsrErase = require('../services/dsrEraseService');

    if (!dsrErase.isDsrEraseEnabled()) {
      return res.status(503).json({ ok: false, error: 'DSR Erase disabled', code: 'DSR_ERASE_DISABLED' });
    }

    if (!isValidUUID(req.params.requestId)) {
      return res.status(400).json({ ok: false, error: 'Invalid request ID' });
    }

    const result = await dsrErase.approveEraseRequest(
      req.params.requestId,
      req.user.company_id,
      req.user.id
    );

    if (!result.ok) {
      const code = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(code).json(result);
    }

    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'dsr_erase_approved',
      entityType: 'lgpd_data_request',
      entityId: req.params.requestId,
      description: 'DSR Erase request approved by DPO/admin',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'critical',
    });

    // Non-blocking notification to subject
    const dsrNotifyEraseApprove = require('../services/dsrNotificationService');
    const eraseReqData = await db.query('SELECT user_id FROM lgpd_data_requests WHERE id = $1', [req.params.requestId]).catch(() => ({ rows: [] }));
    if (eraseReqData.rows[0]?.user_id) {
      dsrNotifyEraseApprove.notify({ userId: eraseReqData.rows[0].user_id, companyId: req.user.company_id, type: dsrNotifyEraseApprove.DSR_NOTIFICATION_TYPES.ERASE_APPROVED, requestId: req.params.requestId }).catch(() => {});
    }

    res.json({ ...result, _meta: { correlation_id: correlationId } });
  } catch (err) {
    console.error('[DSR_ERASE_APPROVE]', err);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

/**
 * POST /api/lgpd/subject/erase/:requestId/execute
 * Executa erasure aprovado (DPO / hierarchy ≤ 1).
 * Soft-delete + anonymization markers. Reversível por 72h.
 */
router.post('/subject/erase/:requestId/execute', requireAuth, requireHierarchy(1), async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || `dsr_exec_${Date.now()}`;

  try {
    const dsrErase = require('../services/dsrEraseService');

    if (!dsrErase.isDsrEraseEnabled()) {
      return res.status(503).json({ ok: false, error: 'DSR Erase disabled', code: 'DSR_ERASE_DISABLED' });
    }

    if (!isValidUUID(req.params.requestId)) {
      return res.status(400).json({ ok: false, error: 'Invalid request ID' });
    }

    const result = await dsrErase.executeErasure(req.params.requestId, req.user.company_id);

    if (!result.ok) {
      const code = result.code === 'NOT_FOUND' ? 404 : result.code === 'NOT_APPROVED' ? 403 : 400;
      return res.status(code).json(result);
    }

    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'dsr_erase_executed',
      entityType: 'lgpd_data_request',
      entityId: req.params.requestId,
      description: `DSR Erase executed: ${result.summary.total_affected} registos afectados em ${result.summary.tables_processed} tabelas. Rollback até ${result.summary.rollback_deadline}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'critical',
    });

    // Non-blocking notification — subject may already be soft-deleted, best-effort
    const dsrNotifyEraseExec = require('../services/dsrNotificationService');
    const eraseExecData = await db.query('SELECT user_id FROM lgpd_data_requests WHERE id = $1', [req.params.requestId]).catch(() => ({ rows: [] }));
    if (eraseExecData.rows[0]?.user_id) {
      dsrNotifyEraseExec.notify({ userId: eraseExecData.rows[0].user_id, companyId: req.user.company_id, type: dsrNotifyEraseExec.DSR_NOTIFICATION_TYPES.ERASE_EXECUTED, requestId: req.params.requestId }).catch(() => {});
    }

    res.json({ ...result, _meta: { correlation_id: correlationId } });
  } catch (err) {
    console.error('[DSR_ERASE_EXECUTE]', err);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

/**
 * POST /api/lgpd/subject/erase/:requestId/reject
 * Rejeita pedido de erasure (DPO / hierarchy ≤ 1).
 * Justificativa legal obrigatória.
 */
router.post('/subject/erase/:requestId/reject', requireAuth, requireHierarchy(1), async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || `dsr_reject_${Date.now()}`;

  try {
    const dsrErase = require('../services/dsrEraseService');
    const dsrNotify = require('../services/dsrNotificationService');

    if (!dsrErase.isDsrEraseEnabled()) {
      return res.status(503).json({ ok: false, error: 'DSR Erase disabled', code: 'DSR_ERASE_DISABLED' });
    }

    if (!isValidUUID(req.params.requestId)) {
      return res.status(400).json({ ok: false, error: 'Invalid request ID' });
    }

    const { legal_justification } = req.body || {};
    if (!legal_justification || typeof legal_justification !== 'string') {
      return res.status(400).json({ ok: false, error: 'legal_justification is required in body', code: 'JUSTIFICATION_REQUIRED' });
    }

    const result = await dsrErase.rejectEraseRequest(
      req.params.requestId,
      req.user.company_id,
      req.user.id,
      legal_justification
    );

    if (!result.ok) {
      const status = result.code === 'NOT_FOUND' ? 404
        : result.code === 'JUSTIFICATION_REQUIRED' ? 400
        : 400;
      return res.status(status).json(result);
    }

    // Notify titular
    dsrNotify.notify({
      userId: result.user_id,
      companyId: req.user.company_id,
      type: dsrNotify.DSR_NOTIFICATION_TYPES.ERASE_REJECTED,
      requestId: req.params.requestId,
      message: `Seu pedido de exclusão de dados foi rejeitado. Justificativa: ${legal_justification.slice(0, 200)}`,
    }).catch(() => {});

    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'dsr_erase_rejected',
      entityType: 'lgpd_data_request',
      entityId: req.params.requestId,
      description: `DSR Erase REJECTED — justificativa: ${legal_justification.slice(0, 200)}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'high',
    });

    res.json({ ...result, _meta: { correlation_id: correlationId } });
  } catch (err) {
    console.error('[DSR_ERASE_REJECT]', err);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

/**
 * POST /api/lgpd/subject/export/:id/reject
 * Rejeita pedido de exportação (DPO / hierarchy ≤ 1).
 * Justificativa legal obrigatória.
 */
router.post('/subject/export/:id/reject', requireAuth, requireHierarchy(1), async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || `dsr_reject_${Date.now()}`;

  try {
    const dsrNotify = require('../services/dsrNotificationService');

    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'Invalid request ID' });
    }

    const { legal_justification } = req.body || {};
    if (!legal_justification || typeof legal_justification !== 'string' || legal_justification.trim().length < 10) {
      return res.status(400).json({ ok: false, error: 'legal_justification is required (min 10 chars)', code: 'JUSTIFICATION_REQUIRED' });
    }

    const req2 = await db.query(
      `SELECT id, user_id, status FROM lgpd_data_requests
       WHERE id = $1 AND company_id = $2 AND request_type = 'portability'`,
      [req.params.id, req.user.company_id]
    );

    if (req2.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Request not found', code: 'NOT_FOUND' });
    }

    if (req2.rows[0].status !== 'pending' && req2.rows[0].status !== 'approved') {
      return res.status(400).json({ ok: false, error: `Cannot reject: status is '${req2.rows[0].status}'`, code: 'INVALID_STATUS' });
    }

    await db.query(
      `UPDATE lgpd_data_requests SET status = 'rejected', assigned_to = $1, processed_at = NOW(),
       response = $2 WHERE id = $3`,
      [req.user.id, `[REJECTED] ${legal_justification.trim()}`, req.params.id]
    );

    // Notify titular
    dsrNotify.notify({
      userId: req2.rows[0].user_id,
      companyId: req.user.company_id,
      type: dsrNotify.DSR_NOTIFICATION_TYPES.EXPORT_REJECTED,
      requestId: req.params.id,
      message: `Seu pedido de exportação foi rejeitado. Justificativa: ${legal_justification.slice(0, 200)}`,
    }).catch(() => {});

    await logAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      userName: req.user.name,
      action: 'dsr_export_rejected',
      entityType: 'lgpd_data_request',
      entityId: req.params.id,
      description: `DSR Export REJECTED — justificativa: ${legal_justification.slice(0, 200)}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'high',
    });

    res.json({
      ok: true,
      request_id: req.params.id,
      status: 'rejected',
      rejected_by: req.user.id,
      rejected_at: new Date().toISOString(),
      legal_justification: legal_justification.trim(),
      _meta: { correlation_id: correlationId },
    });
  } catch (err) {
    console.error('[DSR_EXPORT_REJECT]', err);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

/**
 * GET /api/lgpd/policy
 * Expõe políticas de retenção aplicáveis ao titular (Art. 9 LGPD — Transparência).
 * Retorna: tabelas com dados pessoais, TTLs, base legal, acções de retention.
 * Não requer role especial — qualquer utilizador autenticado pode consultar.
 */
router.get('/policy', requireAuth, async (req, res) => {
  try {
    const registry = require('../governance/retentionPolicyRegistry');
    const policies = registry.getAllPolicies();

    const publicPolicies = policies
      .filter(p => p.pii || p.dsr_erasable)
      .map(p => ({
        table: p.table,
        retention_days: p.ttl_days,
        action: p.action,
        legal_basis: p.legal_basis,
        data_class: p.data_class,
        erasable_on_request: p.dsr_erasable,
        notes: p.notes || null,
      }));

    const dsrInfo = {
      export: {
        enabled: String(process.env.IMPETUS_DSR_EXPORT || 'off').toLowerCase() === 'on',
        endpoint: 'GET /api/lgpd/subject/me/export',
        sla_days: 21,
        format: 'JSON structured',
      },
      erase: {
        enabled: String(process.env.IMPETUS_DSR_ERASE || 'off').toLowerCase() === 'on',
        endpoint: 'POST /api/lgpd/subject/me/erase',
        sla_days: 21,
        rollback_window_hours: 72,
        approval_required: true,
      },
    };

    res.json({
      ok: true,
      version: '1.0',
      dsr: dsrInfo,
      retention_policies: publicPolicies,
      total_policies: publicPolicies.length,
      legally_immutable_tables: policies.filter(p => p.ttl_days === null && p.data_class === 'audit_immutable').length,
      _meta: {
        generated_at: new Date().toISOString(),
        tenant: req.user.company_id,
        lgpd_articles: ['Art. 9 (Transparência)', 'Art. 18 (Direitos do Titular)', 'Art. 16 (Eliminação)'],
      },
    });
  } catch (err) {
    console.error('[LGPD_POLICY]', err);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

module.exports = router;
