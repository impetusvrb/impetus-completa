/**
 * Governança administrativa do tenant — API (Fase 1)
 */
'use strict';

const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { requireAuth, requireTenantAdminRole } = require('../../middleware/auth');
const { auditMiddleware, logAction } = require('../../middleware/audit');
const { isValidUUID } = require('../../utils/security');
const tenantAdminService = require('../../services/tenantAdminService');

function requireTenantAdminManager(req, res, next) {
  if (req.user.tenant_admin_can_manage === true) {
    return next();
  }
  logAction({
    companyId: req.user.company_id,
    userId: req.user.id,
    action: 'access_denied',
    entityType: 'tenant_admin',
    description: 'Gestão de admins do tenant: requer primary ou recovery',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    severity: 'warning',
    success: false
  }).catch(() => {});
  return res.status(403).json({
    ok: false,
    error: 'Apenas o administrador primário ou de recuperação pode alterar a governança do tenant.',
    code: 'TENANT_ADMIN_MANAGER_REQUIRED'
  });
}

const promoteBody = z.object({
  user_id: z.string().uuid(),
  admin_type: z.enum(['primary', 'secondary', 'recovery'])
});

router.get(
  '/',
  requireAuth,
  requireTenantAdminRole,
  async (req, res) => {
    try {
      if (!tenantAdminService.isGovernanceEnabled()) {
        return res.json({ ok: true, governance_enabled: false, admins: [] });
      }
      const admins = await tenantAdminService.listTenantAdmins(req.user.company_id);
      return res.json({
        ok: true,
        governance_enabled: true,
        tenant_admin_type: req.user.tenant_admin_type || null,
        tenant_admin_can_manage: !!req.user.tenant_admin_can_manage,
        admins
      });
    } catch (e) {
      console.error('[TENANT_ADMINS_LIST]', e);
      return res.status(500).json({ ok: false, error: 'Erro ao listar administradores do tenant' });
    }
  }
);

router.post(
  '/',
  requireAuth,
  requireTenantAdminRole,
  requireTenantAdminManager,
  auditMiddleware({ action: 'tenant_admin_promoted', entityType: 'tenant_admin', severity: 'warning' }),
  async (req, res) => {
    try {
      if (!tenantAdminService.isGovernanceEnabled()) {
        return res.status(503).json({ ok: false, error: 'Governança de tenant desactivada' });
      }
      const body = promoteBody.parse(req.body);
      const out = await tenantAdminService.promoteOrSetAdminType({
        companyId: req.user.company_id,
        actorUserId: req.user.id,
        targetUserId: body.user_id,
        adminType: body.admin_type
      });
      if (!out.ok) {
        const status = out.code === 'USER_NOT_FOUND' || out.code === 'USER_INACTIVE' ? 400 : 409;
        return res.status(status).json({ ok: false, error: out.error, code: out.code });
      }
      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'tenant_admin_promoted',
        entityType: 'tenant_admin',
        details: { target_user_id: body.user_id, admin_type: body.admin_type },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      console.log('[RECOVERY_ADMIN_ACTION]', {
        event: 'promote',
        actor: req.user.id,
        company_id: req.user.company_id,
        target: body.user_id,
        admin_type: body.admin_type
      });
      return res.json({ ok: true, message: 'Administrador do tenant actualizado' });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ ok: false, error: 'Dados inválidos', details: e.errors });
      }
      console.error('[TENANT_ADMINS_POST]', e);
      return res.status(500).json({ ok: false, error: 'Erro ao promover administrador' });
    }
  }
);

router.delete(
  '/:id',
  requireAuth,
  requireTenantAdminRole,
  requireTenantAdminManager,
  auditMiddleware({ action: 'tenant_admin_revoked', entityType: 'tenant_admin', severity: 'warning' }),
  async (req, res) => {
    try {
      if (!isValidUUID(req.params.id)) {
        return res.status(400).json({ ok: false, error: 'ID inválido' });
      }
      if (!tenantAdminService.isGovernanceEnabled()) {
        return res.status(503).json({ ok: false, error: 'Governança de tenant desactivada' });
      }
      const out = await tenantAdminService.revokeTenantAdmin({
        companyId: req.user.company_id,
        actorUserId: req.user.id,
        tenantAdminRowId: req.params.id
      });
      if (!out.ok) {
        const st = out.code === 'LAST_ADMIN_PROTECTION' ? 400 : 404;
        return res.status(st).json({ ok: false, error: out.error, code: out.code });
      }
      console.log('[RECOVERY_ADMIN_ACTION]', {
        event: 'revoke',
        actor: req.user.id,
        company_id: req.user.company_id,
        tenant_admin_row: req.params.id
      });
      return res.json({ ok: true, message: 'Administrador do tenant revogado' });
    } catch (e) {
      console.error('[TENANT_ADMINS_DELETE]', e);
      return res.status(500).json({ ok: false, error: 'Erro ao revogar' });
    }
  }
);

module.exports = router;
