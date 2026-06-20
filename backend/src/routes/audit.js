'use strict';

/**
 * Montagem /api/audit — endpoints read-only de auditoria operacional.
 * Logs de auditoria para UI admin usam GET /api/admin/logs/audit (admin/logs.js).
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireTenantAdminRole } = require('../middleware/auth');
const subscriptionGovernance = require('../services/subscription/subscriptionGovernanceScheduler');
const notificationCenter = require('../services/notificationCenterService');
const notificationBridge = require('../services/notificationBridgeService');
const subscriptionUxAudit = require('../services/subscription/subscriptionUxAuditService');
const billingNotifications = require('../services/subscription/subscriptionBillingNotificationService');
const notificationFederation = require('../services/notificationFederationService');

/**
 * GET /api/audit/subscription-governance/status
 * Estado do scheduler de governança de assinaturas (AUD-WORKERS-01-FIX-SUBSCRIPTION).
 */
router.get('/subscription-governance/status', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = subscriptionGovernance.getStatus();
    res.json({
      ok: true,
      enabled: status.enabled,
      flag_active: status.flag_active,
      last_execution: status.last_execution,
      last_success: status.last_success,
      last_error: status.last_error,
      last_metrics: status.last_metrics
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de governança de assinaturas'
    });
  }
});

/**
 * GET /api/audit/notification-center/status
 * Estado read-only do Notification Center (AUD-NOTIFICATION-CENTER-02-FIX).
 */
router.get('/notification-center/status', requireAuth, requireTenantAdminRole, async (req, res) => {
  try {
    const status = await notificationCenter.getAuditStatus(req.user.company_id);
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status do Notification Center'
    });
  }
});

/**
 * GET /api/audit/notification-center/bridges
 * Registo read-only dos bridges NC-03 (produtores consolidados).
 */
router.get('/notification-center/bridges', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const registry = notificationBridge.getBridgeRegistry();
    res.json({
      ok: true,
      operational_alerts: registry.operational_alerts === true,
      tpm: registry.tpm === true,
      ai_proactive: registry.ai_proactive === true,
      executive_mode: registry.executive_mode === true,
      bridge_enabled: registry.enabled,
      metrics: notificationBridge.getBridgeMetricsSnapshot()
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter bridges do Notification Center'
    });
  }
});

/**
 * GET /api/audit/subscription-ux/status
 * Estado read-only da consistência UX de assinatura (FIX-SUBSCRIPTION-UX-01).
 */
router.get('/subscription-ux/status', requireAuth, requireTenantAdminRole, async (req, res) => {
  try {
    const status = await subscriptionUxAudit.getSubscriptionUxAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status UX de assinatura'
    });
  }
});

/**
 * GET /api/audit/billing-notifications/status
 * Estado read-only das notificações progressivas de billing (BILLING-NOTIF-02).
 */
router.get('/billing-notifications/status', requireAuth, requireTenantAdminRole, async (req, res) => {
  try {
    const status = await billingNotifications.getAuditStatus(req.user.company_id);
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de billing notifications'
    });
  }
});

/**
 * GET /api/audit/notification-center/federation
 * Estado read-only da federação NC-04.
 */
router.get('/notification-center/federation', requireAuth, requireTenantAdminRole, async (req, res) => {
  try {
    const status = await notificationFederation.getFederationAuditStatus(req.user.company_id);
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de federação'
    });
  }
});

module.exports = router;
