'use strict';

/**
 * Fase H — Enterprise Readiness API (internal only).
 * GET /api/internal/governance/readiness
 * GET /api/internal/governance/readiness/tenant/:tenantId
 * GET /api/internal/governance/activation-plan
 * GET /api/internal/governance/quality-gates
 */

const express = require('express');
const router = express.Router();

const phaseH = require('../../governanceReadiness/config/phaseHFeatureFlags');
const { assessReadiness } = require('../../governanceReadiness/governanceReadinessEngine');
const { buildActivationPlan } = require('../../governanceReadiness/governanceActivationPlanner');
const { evaluateTenantReadiness } = require('../../governanceReadiness/tenantGovernanceReadiness');
const { evaluatePromotion } = require('../../governanceReadiness/governancePromotionService');
const { evaluateQualityGate } = require('../../governanceQuality/governanceQualityGate');
const { coordinateRollback } = require('../../governanceReadiness/governanceRollbackCoordinator');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('VIEW_AUDIT_LOGS') || perms.includes('GOVERNANCE_OVERSIGHT');
}

function requireGovernanceRole(req, res, next) {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito a governança interna.' });
  }
  next();
}

router.use(requireGovernanceRole);

router.get('/readiness', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const report = assessReadiness({ force: req.query.force === '1' || phaseH.isGovernanceReadinessEnabled() });
  res.json({ ok: true, flags: { readiness: phaseH.isGovernanceReadinessEnabled() }, ...report });
});

router.get('/readiness/tenant/:tenantId', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const tenant = {
    id: req.params.tenantId,
    company_id: req.params.tenantId,
    industry: req.query.industry,
    user_count: Number(req.query.users) || 0,
    multi_domain: req.query.multi_domain === '1',
    critical_infrastructure: req.query.critical === '1'
  };
  const evaluation = evaluateTenantReadiness(tenant, {});
  res.json({ ok: true, ...evaluation });
});

router.get('/activation-plan', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const readiness = assessReadiness({ force: true });
  const plan = buildActivationPlan({ ...readiness, force: true });
  const promotion = evaluatePromotion({ force: true });
  res.json({
    ok: true,
    auto_execute: false,
    readiness_score: readiness.readiness_score,
    plan,
    promotion
  });
});

router.get('/quality-gates', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const readiness = assessReadiness({ force: true });
  const gate = evaluateQualityGate(readiness, { force: req.query.force === '1' });
  res.json({
    ok: true,
    quality_gates_enabled: phaseH.isGovernanceQualityGatesEnabled(),
    readiness_summary: {
      readiness_score: readiness.readiness_score,
      shadow_alignment_rate: readiness.shadow_alignment_rate,
      governance_confidence_score: readiness.governance_confidence_score
    },
    gate,
    rollback_plan: coordinateRollback({ scope: req.query.rollback_scope || 'phase_f_only' })
  });
});

module.exports = router;
