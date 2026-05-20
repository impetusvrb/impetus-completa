'use strict';

const express = require('express');
const router = express.Router();

const facade = require('../../tenantRollout/tenantRolloutFacade');
const supervisor = require('../../tenantRollout/tenantRolloutSupervisor');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

function tenantFromReq(req) {
  return req.params.tenant || req.query.tenant_id || req.body?.tenant_id || req.user?.company_id;
}

function ctxFromReq(req) {
  return {
    ...req.body,
    functional_axis: req.query.axis || req.body?.functional_axis,
    force: req.query.force === '1' || req.body?.force === true,
    force_order: req.body?.force_order === true,
    kpi_payload: req.body?.kpis || req.body?.kpi_payload,
    summary_payload: req.body?.summary || req.body?.summary_payload
  };
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  }
  next();
});

router.get('/status', (req, res) => {
  res.json({ ok: true, ...facade.getTenantRolloutStatus() });
});

router.get('/tenants', (req, res) => {
  const tenantId = tenantFromReq(req);
  res.json({
    ok: true,
    ...facade.superviseTenantRollout(tenantId, req.user, ctxFromReq(req))
  });
});

router.get('/health', (req, res) => {
  const tenantId = tenantFromReq(req);
  res.json({
    ok: true,
    ...facade.measureTenantGovernanceHealth(tenantId, ctxFromReq(req))
  });
});

router.get('/stability', (req, res) => {
  const tenantId = tenantFromReq(req);
  const observation = facade.observeTenantRuntime(tenantId, ctxFromReq(req));
  const supervision = facade.superviseTenantRollout(tenantId, req.user, ctxFromReq(req));
  res.json({ ok: true, observation, stable: supervision.stable, rollout_safe: supervision.rollout_safe });
});

router.get('/activation', (req, res) => {
  const tenantId = tenantFromReq(req);
  const s = facade.superviseTenantRollout(tenantId, req.user, ctxFromReq(req));
  res.json({
    ok: true,
    tenant_id: tenantId,
    sequence: s.activation_order,
    active_channels: s.active_channels,
    next_channel: s.next_channel,
    state: s.state
  });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const tenantId = tenantFromReq(req);
  res.json(facade.getTenantRolloutReport(tenantId, req.user, ctxFromReq(req)));
});

router.post('/activate/:tenant', (req, res) => {
  const tenantId = req.params.tenant;
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by) {
    return res.status(400).json({ ok: false, error: 'approved_by obrigatório' });
  }
  const result = facade.activateTenantRollout(tenantId, req.user, {
    ...ctxFromReq(req),
    approved_by,
    execute: req.body?.execute === true,
    channel: req.body?.channel
  });
  const status = result.activation?.ok === false && !result.activation?.prepared ? 409 : 200;
  res.status(status).json({ ok: result.activation?.ok !== false, ...result });
});

router.post('/deactivate/:tenant', (req, res) => {
  const tenantId = req.params.tenant;
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by) {
    return res.status(400).json({ ok: false, error: 'approved_by obrigatório' });
  }
  if (req.body?.execute !== true) {
    return res.status(400).json({ ok: false, error: 'execute=true obrigatório para desactivação real' });
  }
  const result = facade.deactivateTenantRollout(tenantId, {
    ...ctxFromReq(req),
    approved_by,
    execute: true,
    channel: req.body?.channel
  });
  res.json({ ok: result.deactivation?.ok !== false, ...result });
});

module.exports = router;
