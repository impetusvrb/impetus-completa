/**
 * IMPETUS Fase 2 — Support Recovery Governance (portal Impetus Admin apenas)
 * Sem acesso a dados operacionais; só estado de governança + workflow auditado.
 */
'use strict';

const express = require('express');
const { z } = require('zod');
const {
  requireAdminAuth,
  requireAdminProfiles
} = require('../../middleware/adminPortalAuth');
const supportRecovery = require('../../services/supportRecoveryGovernanceService');
const db = require('../../db');
const { isValidUUID } = require('../../utils/security');

const router = express.Router();

/** Iniciar / aprovar: super_admin ou admin_suporte. Executar: apenas super_admin (camada mais restrita). */
const requireSupportRecoveryActor = requireAdminProfiles('super_admin', 'admin_suporte');
const requireSupportExecutor = requireAdminProfiles('super_admin');

const createSchema = z.object({
  company_id: z.string().uuid(),
  recovery_reason: z.string().min(10).max(4000),
  ticket_reference: z.string().min(4).max(256),
  ownership_notes: z.string().max(2000).optional(),
  forced_non_orphan: z.boolean().optional()
});

const executeSchema = z.object({
  target_user_id: z.string().uuid(),
  admin_type: z.enum(['recovery', 'primary'])
});

router.get('/governance/:companyId', requireAdminAuth, requireSupportRecoveryActor, async (req, res) => {
  try {
    if (!isValidUUID(req.params.companyId)) {
      return res.status(400).json({ ok: false, error: 'company_id inválido' });
    }
    const snap = await supportRecovery.getGovernanceSnapshot(req.params.companyId);
    if (!snap.ok) {
      return res.status(404).json(snap);
    }
    const users = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.active, u.is_company_root
       FROM users u
       WHERE u.company_id = $1 AND u.deleted_at IS NULL AND u.active = true
       ORDER BY u.name ASC
       LIMIT 500`,
      [req.params.companyId]
    );
    const recent = await supportRecovery.listRecentOperations(req.params.companyId, 15);
    return res.json({
      ok: true,
      governance: snap,
      company_users: users.rows,
      recent_operations: recent,
      feature_enabled: supportRecovery.isFeatureEnabled(),
      execute_ttl_minutes: supportRecovery.executeTtlMinutes()
    });
  } catch (e) {
    console.error('[supportRecovery][governance]', e);
    return res.status(500).json({ ok: false, error: 'Erro ao carregar governança' });
  }
});

router.post('/operations', requireAdminAuth, requireSupportRecoveryActor, async (req, res) => {
  try {
    const body = createSchema.parse(req.body);
    let forced = !!body.forced_non_orphan;
    if (forced && req.adminUser.perfil !== 'super_admin') {
      return res.status(403).json({
        ok: false,
        code: 'FORBIDDEN_FORCE',
        error: 'Apenas super_admin pode forçar recuperação quando o tenant não está órfão.'
      });
    }
    const out = await supportRecovery.createOperation({
      companyId: body.company_id,
      recoveryReason: body.recovery_reason,
      ticketReference: body.ticket_reference,
      ownershipNotes: body.ownership_notes,
      forcedNonOrphan: forced,
      requestedByAdminId: req.adminUser.id,
      requestIp: req.ip,
      userAgent: req.get('user-agent')
    });
    if (!out.ok) {
      const st = out.code === 'NOT_ORPHAN' ? 409 : 400;
      return res.status(st).json(out);
    }
    return res.status(201).json({ ok: true, operation: out.operation });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Dados inválidos', details: e.errors });
    }
    console.error('[supportRecovery][create]', e);
    return res.status(500).json({ ok: false, error: 'Erro ao criar operação' });
  }
});

router.post('/operations/:id/approve', requireAdminAuth, requireSupportRecoveryActor, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'ID inválido' });
    }
    const out = await supportRecovery.approveOperation({
      operationId: req.params.id,
      approverAdminId: req.adminUser.id,
      approveIp: req.ip,
      userAgent: req.get('user-agent')
    });
    if (!out.ok) {
      const st = out.code === 'SAME_ACTOR' ? 400 : 404;
      return res.status(st).json(out);
    }
    return res.json({ ok: true, execute_deadline: out.execute_deadline });
  } catch (e) {
    console.error('[supportRecovery][approve]', e);
    return res.status(500).json({ ok: false, error: 'Erro ao aprovar' });
  }
});

router.post('/operations/:id/deny', requireAdminAuth, requireSupportRecoveryActor, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'ID inválido' });
    }
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;
    const out = await supportRecovery.denyOperation({
      operationId: req.params.id,
      actorAdminId: req.adminUser.id,
      denyIp: req.ip,
      reason
    });
    if (!out.ok) return res.status(400).json(out);
    return res.json({ ok: true });
  } catch (e) {
    console.error('[supportRecovery][deny]', e);
    return res.status(500).json({ ok: false, error: 'Erro ao negar' });
  }
});

router.post('/operations/:id/execute', requireAdminAuth, requireSupportExecutor, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'ID inválido' });
    }
    const body = executeSchema.parse(req.body);
    const out = await supportRecovery.executeOperation({
      operationId: req.params.id,
      targetUserId: body.target_user_id,
      adminType: body.admin_type,
      executorAdminId: req.adminUser.id,
      executeIp: req.ip,
      userAgent: req.get('user-agent')
    });
    if (!out.ok) {
      const st = out.code === 'EXPIRED' ? 410 : out.code === 'INVALID_TARGET' ? 400 : 409;
      return res.status(st).json(out);
    }
    return res.json({ ok: true, sessions_invalidated: out.sessions_invalidated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Dados inválidos', details: e.errors });
    }
    console.error('[supportRecovery][execute]', e);
    return res.status(500).json({ ok: false, error: 'Erro ao executar' });
  }
});

module.exports = router;
