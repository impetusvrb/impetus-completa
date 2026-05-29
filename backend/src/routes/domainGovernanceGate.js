'use strict';

/**
 * Routes: Domain Governance Gate API
 *
 * Expõe endpoints para:
 *   - Avaliar policy engine (dry-run)
 *   - Submeter/aprovar/rejeitar publicações Safety/Environment
 *   - Verificar Gate de saída de shadow
 *   - Health do policy engine
 *
 * Todas as rotas exigem autenticação + RBAC validado no middleware.
 */

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

const domainPolicyEngine = require('../governance/domainPolicyEngine');

router.get('/health', requireAuth, (req, res) => {
  res.json({ ok: true, ...domainPolicyEngine.getEngineHealth() });
});

router.post('/evaluate', requireAuth, (req, res) => {
  const { domain, action_type, risk_level, runtime_mode } = req.body;
  const user = req.user;
  const input = {
    domain: domain || 'safety',
    action_type: action_type || 'publish',
    user_role: user.role || user.profile_code || user.cargo || '',
    risk_level: risk_level || 'medium',
    runtime_mode: runtime_mode || 'shadow',
    company_id: user.company_id
  };
  const result = domainPolicyEngine.evaluate(input);
  res.json({ ok: true, evaluation: result });
});

router.post('/approval/submit', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { domain, action_type, responsible_engineer_id, context_payload } = req.body;

    if (!domain || !['safety', 'environment'].includes(domain)) {
      return res.status(400).json({ ok: false, error: 'domain must be safety or environment' });
    }
    if (!responsible_engineer_id) {
      return res.status(400).json({ ok: false, error: 'responsible_engineer_id is required' });
    }

    const policyEval = domainPolicyEngine.evaluate({
      domain,
      action_type: action_type || 'publish',
      user_role: user.role || user.profile_code || '',
      risk_level: req.body.risk_level || 'high',
      runtime_mode: req.body.runtime_mode || 'on',
      company_id: user.company_id
    });

    const result = await domainPolicyEngine.submitForApproval({
      domain,
      action_type: action_type || 'publish',
      company_id: user.company_id,
      requested_by_user_id: user.id,
      responsible_engineer_id,
      policy_evaluation: policyEval,
      context_payload: context_payload || null
    });

    res.json(result);
  } catch (err) {
    console.error('[DOMAIN_GOV_GATE] submit error:', err?.message);
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

router.post('/approval/:id/approve', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const approvalId = req.params.id;
    const userRole = user.role || user.profile_code || user.cargo || '';

    const result = await domainPolicyEngine.approve(approvalId, user.company_id, user.id, userRole);
    res.json(result);
  } catch (err) {
    console.error('[DOMAIN_GOV_GATE] approve error:', err?.message);
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

router.post('/approval/:id/reject', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const approvalId = req.params.id;
    const userRole = user.role || user.profile_code || user.cargo || '';
    const reason = req.body.reason || null;

    const result = await domainPolicyEngine.reject(approvalId, user.company_id, user.id, userRole, reason);
    res.json(result);
  } catch (err) {
    console.error('[DOMAIN_GOV_GATE] reject error:', err?.message);
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

router.get('/approval/pending', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const domain = req.query.domain || 'safety';
    const result = await domainPolicyEngine.listPendingApprovals(user.company_id, domain);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

router.get('/gate/:domain', requireAuth, async (req, res) => {
  try {
    const domain = req.params.domain;
    if (!['safety', 'environment'].includes(domain)) {
      return res.status(400).json({ ok: false, error: 'domain must be safety or environment' });
    }

    const user = req.user;
    const db = require('../db');

    let hasApprovedPublication = false;
    try {
      const r = await db.query(
        `SELECT COUNT(*) as cnt FROM domain_publication_approvals
         WHERE company_id = $1::uuid AND domain = $2 AND status = 'approved'`,
        [user.company_id, domain]
      );
      hasApprovedPublication = Number(r.rows[0]?.cnt || 0) > 0;
    } catch (_) {}

    let responsibleEngineersDefined = false;
    try {
      const approverRoles = domainPolicyEngine.PUBLICATION_ROLES[domain]?.approvers || [];
      const r = await db.query(
        `SELECT COUNT(*) as cnt FROM users
         WHERE company_id = $1::uuid AND LOWER(role) = ANY($2) AND deleted_at IS NULL AND COALESCE(active, true) = true`,
        [user.company_id, approverRoles]
      );
      responsibleEngineersDefined = Number(r.rows[0]?.cnt || 0) > 0;
    } catch (_) {}

    const gate = domainPolicyEngine.evaluateGate(domain, {
      company_id: user.company_id,
      has_approved_publication: hasApprovedPublication,
      responsible_engineers_defined: responsibleEngineersDefined
    });

    res.json({ ok: true, gate });
  } catch (err) {
    console.error('[DOMAIN_GOV_GATE] gate error:', err?.message);
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

router.get('/rbac/:domain', requireAuth, (req, res) => {
  const domain = req.params.domain;
  const user = req.user;
  const userRole = user.role || user.profile_code || user.cargo || '';
  const roleClass = domainPolicyEngine.resolveRoleClass(domain, userRole);
  res.json({
    ok: true,
    domain,
    user_role: userRole,
    role_class: roleClass,
    can_approve: domainPolicyEngine.canApprove(domain, userRole),
    can_operate: domainPolicyEngine.canOperate(domain, userRole),
    publication_roles: domainPolicyEngine.PUBLICATION_ROLES[domain] || null
  });
});

module.exports = router;
