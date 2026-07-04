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
const eventGovernance = require('../services/eventGovernanceService');
const eventGovernanceExecution = require('../services/eventGovernanceExecutionService');
const operationalAlertsGovernance = require('../services/governanceAdapters/operationalAlertsGovernanceAdapter');
const aiProactiveGovernance = require('../services/governanceAdapters/aiProactiveGovernanceAdapter');
const tpmGovernance = require('../services/governanceAdapters/tpmGovernanceAdapter');
const executiveGovernance = require('../services/governanceAdapters/executiveGovernanceAdapter');
const billingGovernance = require('../services/governanceAdapters/billingGovernanceAdapter');
const dsrGovernance = require('../services/governanceAdapters/dsrGovernanceAdapter');
const manuiaGovernance = require('../services/governanceAdapters/manuiaGovernanceAdapter');
const qualityGovernance = require('../services/governanceAdapters/qualityGovernanceAdapter');
const sstGovernance = require('../services/governanceAdapters/sstGovernanceAdapter');
const esgGovernance = require('../services/governanceAdapters/esgGovernanceAdapter');
const aioiGovernance = require('../services/governanceAdapters/aioiGovernanceAdapter');

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

/**
 * GET /api/audit/event-governance/status
 * Estado read-only da governança de eventos (EVENT-GOVERNANCE-01 shadow mode).
 */
router.get('/event-governance/status', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = eventGovernance.getAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de event governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/execution
 * Estado read-only do registry e planos de execução (EVENT-GOVERNANCE-02).
 */
router.get('/event-governance/execution', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = eventGovernanceExecution.getAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de event governance execution'
    });
  }
});

/**
 * GET /api/audit/event-governance/executors
 * Estado read-only dos executores de canal (EVENT-GOVERNANCE-03).
 */
router.get('/event-governance/executors', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = eventGovernanceExecution.getExecutorsAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de event governance executors'
    });
  }
});

/**
 * GET /api/audit/event-governance/operational-alerts
 * Estado read-only da migração Operational Alerts → Governance (EVENT-GOVERNANCE-04).
 */
router.get('/event-governance/operational-alerts', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = operationalAlertsGovernance.getAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de operational alerts governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/ai-proactive
 * Estado read-only da migração IA Proactiva → Governance (EVENT-GOVERNANCE-05).
 */
router.get('/event-governance/ai-proactive', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = aiProactiveGovernance.getAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de ai proactive governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/tpm
 * Estado read-only da migração TPM → Governance (EVENT-GOVERNANCE-06).
 */
router.get('/event-governance/tpm', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = tpmGovernance.getAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de tpm governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/executive
 * Estado read-only da migração Executive Mode → Governance (EVENT-GOVERNANCE-07).
 */
router.get('/event-governance/executive', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = executiveGovernance.getAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de executive governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/billing
 * Estado read-only da migração Billing → Governance (EVENT-GOVERNANCE-08).
 */
router.get('/event-governance/billing', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = billingGovernance.getAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de billing governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/dsr
 * Estado read-only da migração DSR/LGPD → Governance (EVENT-GOVERNANCE-09).
 */
router.get('/event-governance/dsr', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = dsrGovernance.getAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de dsr governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/manuia
 * Estado read-only da migração ManuIA → Governance (EVENT-GOVERNANCE-10).
 */
router.get('/event-governance/manuia', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = manuiaGovernance.getAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de manuia governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/quality
 * Estado read-only da migração Quality → Governance (EVENT-GOVERNANCE-11A).
 */
router.get('/event-governance/quality', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = qualityGovernance.getAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de quality governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/sst
 * Estado read-only da migração SST → Governance (EVENT-GOVERNANCE-11B).
 */
router.get('/event-governance/sst', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = sstGovernance.getAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de sst governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/esg
 * Estado read-only da migração ESG → Governance (EVENT-GOVERNANCE-11C).
 */
router.get('/event-governance/esg', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const status = esgGovernance.getAuditStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de esg governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/aioi
 * Estado read-only integração AIOI → Governance (EVENT-GOVERNANCE-12).
 */
router.get('/event-governance/aioi', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const feed = require('../services/aioiGovernanceFeedService');
    const status = aioiGovernance.getAuditStatus();
    res.json({
      ok: true,
      ...status,
      feed: feed.getFeedStats(),
      catalog: feed.getGovernanceCatalogSnapshot()
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de aioi governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/learning
 * Estado read-only camada de aprendizagem (EVENT-GOVERNANCE-13).
 */
router.get('/event-governance/learning', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const learning = require('../services/governanceLearningService');
    const confidence = require('../services/governanceConfidenceService');
    res.json({
      ok: true,
      ...learning.getAuditStatus(),
      confidence: confidence.getAuditStatus()
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de learning governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/memory
 * Estado read-only memória operacional governada (EVENT-GOVERNANCE-14).
 */
router.get('/event-governance/memory', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const memoryIntegration = require('../services/governanceMemoryIntegrationService');
    const memoryScore = require('../services/governanceMemoryScoreService');
    res.json({
      ok: true,
      ...memoryIntegration.getAuditStatus(),
      memory_score: memoryScore.DEFAULT_MEMORY_SCORE
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de memory governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/explainability
 * Estado read-only Explainable Governance (EVENT-GOVERNANCE-15).
 */
router.get('/event-governance/explainability', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const explainability = require('../services/governanceExplainabilityService');
    res.json({ ok: true, ...explainability.getAuditStatus() });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de explainability governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/intelligence
 * Estado read-only Governance Intelligence (EVENT-GOVERNANCE-16).
 */
router.get('/event-governance/intelligence', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const intelligence = require('../services/governanceIntelligenceService');
    const companyId = req.query.companyId || req.user?.company_id || null;
    const report = intelligence.isIntelligenceEnabled()
      ? intelligence.buildImprovementReport(companyId)
      : null;
    res.json({
      ok: true,
      ...intelligence.getAuditStatus(),
      improvement_report: report
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de intelligence governance'
    });
  }
});

/**
 * GET /api/audit/event-governance/policy-optimization
 * Estado read-only Policy Optimization Advisory (EVENT-GOVERNANCE-17).
 */
router.get('/event-governance/policy-optimization', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const policyOpt = require('../services/governancePolicyOptimizationService');
    const companyId = req.query.companyId || req.user?.company_id || null;
    const report = policyOpt.isPolicyOptimizationEnabled()
      ? policyOpt.buildOptimizationReport(companyId)
      : null;
    res.json({
      ok: true,
      ...policyOpt.getAuditStatus(),
      optimization_report: report
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status de policy optimization'
    });
  }
});

/**
 * GET /api/audit/event-governance/executive-insights
 * Estado read-only Executive Governance Insights (EVENT-GOVERNANCE-18).
 */
router.get('/event-governance/executive-insights', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const executive = require('../services/governanceExecutiveInsightsService');
    const companyId = req.query.companyId || req.user?.company_id || null;
    const result = executive.isExecutiveInsightsEnabled()
      ? executive.generateExecutiveReport(companyId)
      : null;
    res.json({
      ok: true,
      ...executive.getAuditStatus(),
      executive_report: result?.report || null
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter executive governance insights'
    });
  }
});

/**
 * GET /api/audit/event-governance/knowledge-base
 * Estado read-only Governance Knowledge Base (EVENT-GOVERNANCE-19).
 */
router.get('/event-governance/knowledge-base', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const knowledge = require('../services/governanceKnowledgeBaseService');
    const companyId = req.query.companyId || req.user?.company_id || null;
    const type = req.query.type || null;
    const policyId = req.query.policyId || null;
    const q = req.query.q || null;

    let knowledgeReport = null;
    let queryResult = null;

    if (knowledge.isKnowledgeBaseEnabled()) {
      knowledgeReport = knowledge.generateKnowledgeReport(companyId);
      if (type || policyId || q) {
        queryResult = knowledge.queryKnowledge({ companyId, type, policyId, q });
      }
    }

    res.json({
      ok: true,
      ...knowledge.getAuditStatus(),
      knowledge_report: knowledgeReport?.report || null,
      query_result: queryResult
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter governance knowledge base'
    });
  }
});

/**
 * GET /api/audit/eco-convergence/status
 * Estado read-only ECO-03 — flags, observabilidade e adapters bypass.
 */
router.get('/eco-convergence/status', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const ecoFlags = require('../services/ecoConvergenceFlags');
    const chatOperational = require('../services/governanceAdapters/chatOperationalGovernanceAdapter');
    const ncBridgeMirror = require('../services/governanceAdapters/ncBridgeMirrorGovernanceAdapter');

    res.json({
      ok: true,
      phase: 'ECO-03',
      ...ecoFlags.getAuditStatus(),
      adapters: {
        chat_operational: chatOperational.getAuditStatus(),
        nc_bridge_mirror: ncBridgeMirror.getAuditStatus()
      }
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter status ECO convergência'
    });
  }
});

/**
 * GET /api/audit/security-observatory
 * SEC-01 — Enterprise Security Observatory (read-only, observational).
 */
router.get('/security-observatory', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec01 = require('../securityObservatory');
    res.json(sec01.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter Security Observatory'
    });
  }
});

/**
 * GET /api/audit/security-incidents
 * SEC-02 — Enterprise Security Correlation Engine (read-only).
 */
router.get('/security-incidents', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec02 = require('../securityCorrelation');
    res.json(sec02.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter Security Incidents'
    });
  }
});

/**
 * GET /api/audit/security-threat-intelligence
 * SEC-03 — Enterprise Threat Intelligence Engine (read-only, consultative).
 */
router.get('/security-threat-intelligence', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec03 = require('../securityThreatIntelligence');
    res.json(sec03.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter Threat Intelligence'
    });
  }
});

/**
 * GET /api/audit/security-runtime-integrity
 * SEC-04 — Enterprise Runtime Integrity (read-only, observational).
 */
router.get('/security-runtime-integrity', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec04 = require('../securityRuntimeIntegrity');
    res.json(sec04.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter Runtime Integrity'
    });
  }
});

/**
 * GET /api/audit/security-notifications/pending
 * SEC-05 — Notificações pendentes (read-only).
 */
router.get('/security-notifications/pending', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec05 = require('../securityNotification');
    res.json(sec05.getPendingPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter notificações pendentes'
    });
  }
});

/**
 * GET /api/audit/security-notifications
 * SEC-05 — Enterprise Security Notification Center (read-only).
 */
router.get('/security-notifications', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec05 = require('../securityNotification');
    res.json(sec05.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter Security Notifications'
    });
  }
});

/**
 * GET /api/audit/security-response/history
 * SEC-06 — Histórico de respostas orchestradas.
 */
router.get('/security-response/history', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec06 = require('../securityResponse');
    res.json(sec06.getHistoryPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter histórico de respostas'
    });
  }
});

/**
 * GET /api/audit/security-response
 * SEC-06 — Enterprise Security Response Orchestrator (read-only audit).
 */
router.get('/security-response', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec06 = require('../securityResponse');
    res.json(sec06.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter Security Response'
    });
  }
});

/**
 * GET /api/audit/security-soc/executive
 * SEC-07 — SOC Dashboard Executivo (read-only).
 */
router.get('/security-soc/executive', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec07 = require('../securitySOC');
    res.json(sec07.getExecutivePayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter SOC Executivo'
    });
  }
});

/**
 * GET /api/audit/security-soc/operations
 * SEC-07 — SOC Dashboard Operacional (read-only).
 */
router.get('/security-soc/operations', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec07 = require('../securitySOC');
    res.json(sec07.getOperationsPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter SOC Operacional'
    });
  }
});

/**
 * GET /api/audit/security-soc
 * SEC-07 — Enterprise Security Operations Center (read-only).
 */
router.get('/security-soc', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec07 = require('../securitySOC');
    res.json(sec07.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter Security SOC'
    });
  }
});

/**
 * GET /api/audit/security-certification
 * SEC-08 — Enterprise Security Certification v1 (read-only evidência).
 */
router.get('/security-certification', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const evidencePath = path.join(__dirname, '../../docs/evidence/sec-08/certification-latest.json');
    if (!fs.existsSync(evidencePath)) {
      return res.status(404).json({
        ok: false,
        phase: 'SEC-08',
        error: 'Certificação não executada — correr SEC_08_ENTERPRISE_SECURITY_CERTIFICATION.test.js'
      });
    }
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    res.json({ ok: true, phase: 'SEC-08', read_only: true, ...evidence });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Erro ao obter Security Certification'
    });
  }
});

/**
 * GET /api/audit/security-promotion
 * SEC-09 — Enterprise Security Promotion Dashboard (read-only plano + estado).
 */
router.get('/security-promotion', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec09 = require('../securityPromotion');
    res.json(sec09.getPromotionPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-09',
      error: err?.message || 'Erro ao obter Security Promotion'
    });
  }
});

/**
 * GET /api/audit/security-active-defense
 * SEC-10 — Enterprise Active Defense (read-only consultivo).
 */
router.get('/security-active-defense', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec10 = require('../securityActiveDefense');
    res.json(sec10.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-10',
      error: err?.message || 'Erro ao obter Active Defense'
    });
  }
});

/**
 * GET /api/audit/security-adaptive-protection
 * SEC-11 — Enterprise Adaptive Protection (read-only planos).
 */
router.get('/security-adaptive-protection', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec11 = require('../securityAdaptiveProtection');
    res.json(sec11.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-11',
      error: err?.message || 'Erro ao obter Adaptive Protection'
    });
  }
});

/**
 * GET /api/audit/security-execution-validation
 * SEC-12 — Execution Validation Layer (dry-run only).
 */
router.get('/security-execution-validation', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec12 = require('../securityExecutionValidation');
    res.json(sec12.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-12',
      error: err?.message || 'Erro ao obter Execution Validation'
    });
  }
});

/**
 * GET /api/audit/security-controlled-execution
 * SEC-13 — Controlled Protection Execution (read-only audit).
 */
router.get('/security-controlled-execution', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec13 = require('../securityControlledExecution');
    res.json(sec13.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-13',
      error: err?.message || 'Erro ao obter Controlled Execution'
    });
  }
});

/**
 * GET /api/audit/security-operational-promotion
 * SEC-13A — Enterprise Security Operational Promotion & Validation.
 */
router.get('/security-operational-promotion', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec13a = require('../securityPromotionOperational');
    res.json(sec13a.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-13A',
      error: err?.message || 'Erro ao obter Operational Promotion'
    });
  }
});

/**
 * GET /api/audit/security-adaptive-blocking
 * SEC-14 — Enterprise Adaptive Blocking Engine (recomendações only).
 */
router.get('/security-adaptive-blocking', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec14 = require('../securityAdaptiveBlocking');
    res.json(sec14.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-14',
      error: err?.message || 'Erro ao obter Adaptive Blocking'
    });
  }
});

/**
 * GET /api/audit/security-anti-scanner
 * SEC-15 — Anti-Scanner + Anti-Enumeration (contramedidas recomendadas only).
 */
router.get('/security-anti-scanner', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec15 = require('../securityAntiScanner');
    res.json(sec15.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-15',
      error: err?.message || 'Erro ao obter Anti-Scanner'
    });
  }
});

/**
 * GET /api/audit/security-threat-deception
 * SEC-16 — Enterprise Threat Deception Framework (planos certificados only).
 */
router.get('/security-threat-deception', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec16 = require('../securityThreatDeception');
    res.json(sec16.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-16',
      error: err?.message || 'Erro ao obter Threat Deception'
    });
  }
});

/**
 * GET /api/audit/security-exfiltration
 * SEC-17 — Enterprise Exfiltration Detection & Data Protection (consultivo).
 */
router.get('/security-exfiltration', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec17 = require('../securityExfiltrationDetection');
    res.json(sec17.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-17',
      error: err?.message || 'Erro ao obter Exfiltration Detection'
    });
  }
});

/**
 * GET /api/audit/security-runtime-protection
 * SEC-18 — Enterprise Adaptive Runtime Protection (controlador consultivo).
 */
router.get('/security-runtime-protection', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec18 = require('../securityRuntimeProtection');
    res.json(sec18.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-18',
      error: err?.message || 'Erro ao obter Runtime Protection'
    });
  }
});

/**
 * GET /api/audit/security-operational-certification
 * SEC-19 — Enterprise Attack Simulation & Operational Stress Certification (read-only).
 */
router.get('/security-operational-certification', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec19 = require('../securityOperationalCertification');
    res.json(sec19.getAuditPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-19',
      error: err?.message || 'Erro ao obter Operational Certification'
    });
  }
});

/**
 * GET /api/audit/security-certification-v2
 * SEC-20 — Enterprise Security v2 Operational Certification (read-only evidência consolidada).
 */
router.get('/security-certification-v2', requireAuth, requireTenantAdminRole, (req, res) => {
  try {
    const sec20 = require('../securityCertificationV2');
    const payload = sec20.getAuditPayload();
    if (!payload.evidence?.criteria && !payload.dashboard) {
      return res.status(404).json({
        ok: false,
        phase: 'SEC-20',
        error: 'Certificação v2 não executada — correr SEC_20_ENTERPRISE_SECURITY_CERTIFICATION.test.js'
      });
    }
    res.json(payload);
  } catch (err) {
    res.status(500).json({
      ok: false,
      phase: 'SEC-20',
      error: err?.message || 'Erro ao obter Security Certification v2'
    });
  }
});

module.exports = router;
