/**
 * IMPETUS - ROTAS DE VALIDAÇÃO HIERÁRQUICA DE CARGOS
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { requireCompanyActive } = require('../middleware/multiTenant');
const roleVerification = require('../services/roleVerificationService');
const db = require('../db');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/role-verification');
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (err) {
  console.warn('[routes/roleVerification][mkdir_uploads]', err?.message ?? err);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'doc').replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `doc_${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

/**
 * GET /api/role-verification/status
 * Retorna status de verificação do usuário atual
 */
router.get('/status', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const user = req.user;
    const needs = roleVerification.needsVerification(user);
    const u = await db.query(`
      SELECT role_verified, role_verification_status, role_verification_method, is_company_root
      FROM users WHERE id = $1
    `, [user.id]);
    const row = u.rows[0] || {};
    res.json({
      ok: true,
      needs_verification: needs,
      role_verified: row.role_verified === true,
      role_verification_status: row.role_verification_status || 'pending',
      role_verification_method: row.role_verification_method,
      is_company_root: row.is_company_root === true,
      strategic_role: roleVerification.isStrategicRole(user.role)
    });
  } catch (e) {
    console.error('[ROLE_VERIFICATION_STATUS]', e);
    res.status(500).json({ ok: false, error: 'Erro ao obter status' });
  }
});

/**
 * POST /api/role-verification/verify-email
 * Valida por email corporativo
 */
router.post('/verify-email', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const result = await roleVerification.verifyByCorporateEmail(
      req.user.id,
      req.user.company_id,
      req.ip,
      req.get('user-agent')
    );
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    console.error('[ROLE_VERIFICATION_EMAIL]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao validar' });
  }
});

/**
 * POST /api/role-verification/request-approval
 * Solicita aprovação hierárquica
 */
router.post('/request-approval', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const result = await roleVerification.requestHierarchicalApproval(
      req.user.id,
      req.user.company_id,
      req.ip,
      req.get('user-agent')
    );
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    console.error('[ROLE_VERIFICATION_REQUEST]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao solicitar' });
  }
});

/**
 * GET /api/role-verification/pending-approvals
 * Lista solicitações pendentes para o aprovador
 */
router.get('/pending-approvals', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const list = await roleVerification.getPendingApprovalsForUser(req.user.id);
    res.json({ ok: true, requests: list });
  } catch (e) {
    console.error('[ROLE_VERIFICATION_PENDING]', e);
    res.status(500).json({ ok: false, error: 'Erro ao listar' });
  }
});

/**
 * POST /api/role-verification/approve/:requestId
 * Aprova ou rejeita solicitação (body: { approved: true|false, rejection_reason?: string })
 */
router.post('/approve/:requestId', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const { approved, rejection_reason } = req.body || {};
    if (approved !== true) {
      const reason = (rejection_reason != null && String(rejection_reason).trim()) ? String(rejection_reason).trim() : '';
      if (!reason || reason.length < 3) {
        return res.status(400).json({
          ok: false,
          error: 'Motivo da reprovação é obrigatório (mínimo 3 caracteres).',
          code: 'REJECTION_REASON_REQUIRED'
        });
      }
    }
    const result = await roleVerification.processApprovalRequest(
      req.params.requestId,
      req.user.id,
      approved === true,
      rejection_reason,
      req.ip,
      req.get('user-agent')
    );
    if (!result.ok) {
      const code = result.code;
      const status = code === 'FORBIDDEN_APPROVER' || code === 'SELF_APPROVAL' ? 403 : 400;
      return res.status(status).json(result);
    }
    res.json(result);
  } catch (e) {
    console.error('[ROLE_VERIFICATION_APPROVE]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao processar' });
  }
});

/**
 * POST /api/role-verification/upload-document
 * Upload de documento corporativo para validação
 */
router.post('/upload-document',
  requireAuth,
  requireCompanyActive,
  upload.single('document'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ ok: false, error: 'Documento obrigatório' });
      const documentType = req.body.document_type || 'documento_corporativo';
      const result = await roleVerification.processVerificationDocument(
        req.user.id,
        req.user.company_id,
        req.file.path,
        documentType,
        req.ip,
        req.get('user-agent')
      );
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (e) {
      console.error('[ROLE_VERIFICATION_DOCUMENT]', e);
      res.status(500).json({ ok: false, error: e.message || 'Erro ao processar documento' });
    }
  }
);

/**
 * GET /api/role-verification/panel
 * Painel de Validação Organizacional (admin/diretor/gerente)
 */
router.get('/panel', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const role = (req.user.role || '').toLowerCase();
    const allowed = ['internal_admin', 'diretor', 'gerente', 'coordenador', 'supervisor', 'ceo'].includes(role);
    if (!allowed) {
      return res.status(403).json({ ok: false, error: 'Acesso restrito à liderança' });
    }
    const list = await roleVerification.getVerificationPanel(req.user.company_id);
    const suspicious = await roleVerification.detectSuspiciousPatterns(req.user.company_id);
    res.json({ ok: true, users: list, suspicious_alerts: suspicious });
  } catch (e) {
    console.error('[ROLE_VERIFICATION_PANEL]', e?.message || e);
    res.status(500).json({ ok: false, error: 'Erro ao carregar painel' });
  }
});

/**
 * GET /api/role-verification/check-email
 * Verifica se email do usuário é corporativo (sem validar)
 */
router.get('/check-email', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const companyRes = await db.query(
      `SELECT company_domain, email_responsavel FROM companies WHERE id = $1`,
      [req.user.company_id]
    );
    const company = companyRes.rows[0] || {};
    const isCorporate = await roleVerification.checkCorporateEmail(req.user, company);
    res.json({ ok: true, is_corporate: isCorporate });
  } catch (e) {
    console.error('[ROLE_VERIFICATION_CHECK_EMAIL]', e);
    res.status(500).json({ ok: false, error: 'Erro ao verificar' });
  }
});

module.exports = router;
