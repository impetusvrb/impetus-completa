'use strict';

/**
 * Admin — aprendizagem supervisionada (propostas e aprovação explícita).
 * Montado em /api/admin/learning
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireTenantAdminRole, requireCompanyId, requireRole } = require('../middleware/auth');
const supervisedLearningService = require('../services/supervisedLearningService');
const adaptiveTuningService = require('../services/adaptiveTuningService');

const jsonBody = express.json({ limit: '256kb' });
const adminOnly = [requireAuth, requireTenantAdminRole, requireCompanyId];

const strategicLearningService = require('../services/strategicLearningService');
const cognitiveReplayService = require('../services/cognitiveReplayService');
const cognitiveDriftService = require('../services/cognitiveDriftService');
const cognitiveDbPersistenceService = require('../services/cognitiveDbPersistenceService');
const aiAnalyticsService = require('../services/aiAnalyticsService');
const cognitiveConsensusService = require('../services/cognitiveConsensusService');
const cognitiveVotingService = require('../services/cognitiveVotingService');
const confidenceCalibrationService = require('../services/confidenceCalibrationService');
const cognitiveStabilityService = require('../services/cognitiveStabilityService');
const contextIntegrityService = require('../services/contextIntegrityService');
const cognitiveEventBackboneService = require('../services/cognitiveEventBackboneService');
const unifiedOrchestrator = require('../services/unifiedOrchestrator');
const aiSecurityGateway = require('../services/aiSecurityGateway');
const cognitivePolicyDiscoveryService = require('../services/cognitivePolicyDiscoveryService');
const cognitivePolicyDecisionService = require('../services/cognitivePolicyDecisionService');
const cognitivePolicySignalService = require('../services/cognitivePolicySignalService');
const cognitivePolicyFacadeService = require('../services/cognitivePolicyFacadeService');
const cognitivePolicyArbitrationService = require('../services/cognitivePolicyArbitrationService');
const cognitivePolicyObligationService = require('../services/cognitivePolicyObligationService');
const cognitivePolicyGovernanceGraphService = require('../services/cognitivePolicyGovernanceGraphService');
const cognitivePolicyExecutionReadinessService = require('../services/cognitivePolicyExecutionReadinessService');
const cognitivePolicySimulationRuntimeService = require('../services/cognitivePolicySimulationRuntimeService');
const cognitivePolicySandboxRuntimeService = require('../services/cognitivePolicySandboxRuntimeService');
const cognitivePolicyGovernanceDiffService = require('../services/cognitivePolicyGovernanceDiffService');
const cognitivePolicyGovernanceEvolutionService = require('../services/cognitivePolicyGovernanceEvolutionService');

const policyDiscoveryAdmin = [requireAuth, requireRole('admin'), requireCompanyId];

/** GET /dashboard — governança cognitiva consolidada (só leitura). */
router.get('/dashboard', ...adminOnly, async (req, res) => {
  try {
    if (!aiAnalyticsService.isGovernanceDashboardEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Painel de governança cognitiva desactivado (IMPETUS_COGNITIVE_DASHBOARD_ENABLED).',
        code: 'DASHBOARD_DISABLED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const dashboard = await aiAnalyticsService.getCognitiveGovernanceDashboard(companyId);
    /** Fase 1 — Policy Discovery: resumo normativo (não altera runtime). */
    const policy_discovery = cognitivePolicyDiscoveryService.getPolicyDiscoveryDashboardSummary();
    /** Fase 2 — Policy Decision Contract: resumo do schema PDC (não altera runtime). */
    const policy_contract = cognitivePolicyDecisionService.getPolicyContractDashboardSummary();
    /** Fase 3 — Policy Signal Abstraction: resumo PSA (não altera runtime). */
    const policy_signals = cognitivePolicySignalService.getPolicySignalDashboardSummary();
    /** Fase 4 — Policy Facade: agregação normativa passiva (não altera runtime). */
    const policy_facade = cognitivePolicyFacadeService.getPolicyFacadeDashboardSummary();
    /** Fase 5 — Policy Arbitration: conflitos e precedência observáveis (sem enforcement). */
    const policy_arbitration = cognitivePolicyArbitrationService.getPolicyArbitrationDashboardSummary();
    /** Fase 6 — Policy Obligations: deveres normativos declarativos (sem execução). */
    const policy_obligations = cognitivePolicyObligationService.getPolicyObligationDashboardSummary();
    /** Fase 7 — Policy Governance Graph: topologia normativa observável (sem execução). */
    const policy_governance_graph = cognitivePolicyGovernanceGraphService.getPolicyGovernanceGraphDashboardSummary();
    /** Fase 8 — Policy Execution Readiness: prontidão para execução normativa (só leitura). */
    const policy_execution_readiness = cognitivePolicyExecutionReadinessService.getPolicyExecutionReadinessDashboardSummary();
    /** Fase 9 — Policy Simulation Runtime: dry-run normativo (sem execução real). */
    const policy_simulation = cognitivePolicySimulationRuntimeService.getPolicySimulationDashboardSummary();
    /** Fase 10 — Policy Sandbox: shadow runtime paralelo (sem impacto em produção). */
    const policy_sandbox = cognitivePolicySandboxRuntimeService.getPolicySandboxDashboardSummary();
    /** Fase 11 — Policy Governance Diff: comparação estrutural produção vs sandbox (só leitura). */
    const policy_governance_diff = cognitivePolicyGovernanceDiffService.getPolicyGovernanceDiffDashboardSummary();
    /** Fase 12 — Policy Governance Evolution: trajetória e tendências temporais (só leitura). */
    const policy_governance_evolution = cognitivePolicyGovernanceEvolutionService.getPolicyGovernanceEvolutionDashboardSummary();
    return res.json({
      ok: true,
      dashboard: {
        ...dashboard,
        policy_discovery,
        policy_contract,
        policy_signals,
        policy_facade,
        policy_arbitration,
        policy_obligations,
        policy_governance_graph,
        policy_execution_readiness,
        policy_simulation,
        policy_sandbox,
        policy_governance_diff,
        policy_governance_evolution
      }
    });
  } catch (e) {
    try {
      console.warn('[GOVERNANCE_DASHBOARD_ERROR]', { route: 'dashboard', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'governance_dashboard_failed' });
  }
});

/** GET /context-integrity — métricas e eventos da camada de integridade contextual (só leitura). */
router.get('/context-integrity', ...adminOnly, async (req, res) => {
  try {
    if (!aiAnalyticsService.isGovernanceDashboardEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Painel de governança cognitiva desactivado (IMPETUS_COGNITIVE_DASHBOARD_ENABLED).',
        code: 'DASHBOARD_DISABLED'
      });
    }
    const payload = contextIntegrityService.getAdminContextIntegrityPayload();
    return res.json(payload);
  } catch (e) {
    try {
      console.warn('[CONTEXT_INTEGRITY_ADMIN]', e?.message || e);
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'context_integrity_admin_failed' });
  }
});

/** GET /policy-discovery — inventário normativo completo (admin sistema; só leitura). */
router.get('/policy-discovery', ...policyDiscoveryAdmin, async (req, res) => {
  try {
    if (!cognitivePolicyDiscoveryService.isPolicyDiscoveryEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Policy discovery desactivado (IMPETUS_POLICY_DISCOVERY_ENABLED).',
        code: 'POLICY_DISCOVERY_DISABLED'
      });
    }
    const snapshot = cognitivePolicyDiscoveryService.generatePolicyDiscoverySnapshot();
    return res.json({ ok: true, snapshot });
  } catch (e) {
    try {
      console.warn('[POLICY_DISCOVERY]', { route: 'policy-discovery', message: e?.message || e });
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'policy_discovery_failed' });
  }
});

/** GET /policy-contract — catálogo do Policy Decision Contract (PDC); só leitura; não executa efeitos. */
router.get('/policy-contract', ...policyDiscoveryAdmin, async (req, res) => {
  try {
    if (!cognitivePolicyDecisionService.isPolicyContractEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Policy Decision Contract desactivado (IMPETUS_POLICY_CONTRACT_ENABLED).',
        code: 'POLICY_CONTRACT_DISABLED'
      });
    }
    const snapshot = cognitivePolicyDecisionService.generateDecisionContractSnapshot();
    return res.json({ ok: true, snapshot });
  } catch (e) {
    try {
      console.warn('[POLICY_DECISION]', { route: 'policy-contract', message: e?.message || e });
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'policy_contract_failed' });
  }
});

/** GET /policy-signals — PSA: snapshot + sinais de referência (admin; só leitura). */
router.get('/policy-signals', ...policyDiscoveryAdmin, async (req, res) => {
  try {
    if (!cognitivePolicySignalService.isPolicySignalsEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Policy Signal Abstraction desactivada (IMPETUS_POLICY_SIGNALS_ENABLED).',
        code: 'POLICY_SIGNALS_DISABLED'
      });
    }
    const payload = cognitivePolicySignalService.generatePolicySignalsAdminPayload();
    return res.json({ ok: true, ...payload });
  } catch (e) {
    try {
      console.warn('[POLICY_SIGNAL]', { route: 'policy-signals', message: e?.message || e });
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'policy_signals_failed' });
  }
});

/** GET /policy-facade — fachada normativa read-only: snapshot + avaliação demo (admin). */
router.get('/policy-facade', ...policyDiscoveryAdmin, async (req, res) => {
  try {
    if (!cognitivePolicyFacadeService.isPolicyFacadeEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Policy Facade desactivada (IMPETUS_POLICY_FACADE_ENABLED).',
        code: 'POLICY_FACADE_DISABLED'
      });
    }
    const { snapshot, demo_evaluation } = cognitivePolicyFacadeService.generatePolicyFacadeAdminPayload();
    return res.json({ ok: true, snapshot, demo_evaluation });
  } catch (e) {
    try {
      console.warn('[POLICY_FACADE]', { route: 'policy-facade', message: e?.message || e });
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'policy_facade_failed' });
  }
});

/** GET /policy-arbitration — arbitragem normativa read-only: snapshot + relatório demo (admin). */
router.get('/policy-arbitration', ...policyDiscoveryAdmin, async (req, res) => {
  try {
    if (!cognitivePolicyArbitrationService.isPolicyArbitrationEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Policy Arbitration desactivada (IMPETUS_POLICY_ARBITRATION_ENABLED).',
        code: 'POLICY_ARBITRATION_DISABLED'
      });
    }
    const payload = cognitivePolicyArbitrationService.generatePolicyArbitrationAdminPayload();
    return res.json({ ok: true, ...payload });
  } catch (e) {
    try {
      console.warn('[POLICY_ARBITRATION]', { route: 'policy-arbitration', message: e?.message || e });
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'policy_arbitration_failed' });
  }
});

/** GET /policy-obligations — obrigações normativas declarativas: snapshot + relatório demo (admin). */
router.get('/policy-obligations', ...policyDiscoveryAdmin, async (req, res) => {
  try {
    if (!cognitivePolicyObligationService.isPolicyObligationsEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Policy Obligations desactivadas (IMPETUS_POLICY_OBLIGATIONS_ENABLED).',
        code: 'POLICY_OBLIGATIONS_DISABLED'
      });
    }
    const payload = cognitivePolicyObligationService.generatePolicyObligationAdminPayload();
    return res.json({ ok: true, ...payload });
  } catch (e) {
    try {
      console.warn('[POLICY_OBLIGATION]', { route: 'policy-obligations', message: e?.message || e });
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'policy_obligations_failed' });
  }
});

/** GET /policy-graph — grafo normativo cognitivo read-only: snapshot + demo (admin). */
router.get('/policy-graph', ...policyDiscoveryAdmin, async (req, res) => {
  try {
    if (!cognitivePolicyGovernanceGraphService.isPolicyGraphEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Policy Governance Graph desactivado (IMPETUS_POLICY_GRAPH_ENABLED).',
        code: 'POLICY_GRAPH_DISABLED'
      });
    }
    const { snapshot, demo_graph } = cognitivePolicyGovernanceGraphService.generatePolicyGovernanceGraphAdminPayload();
    return res.json({ ok: true, snapshot, demo_graph });
  } catch (e) {
    try {
      console.warn('[POLICY_GRAPH]', { route: 'policy-graph', message: e?.message || e });
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'policy_graph_failed' });
  }
});

/** GET /policy-readiness — prontidão de execução normativa read-only: snapshot + demo (admin). */
router.get('/policy-readiness', ...policyDiscoveryAdmin, async (req, res) => {
  try {
    if (!cognitivePolicyExecutionReadinessService.isPolicyReadinessEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Policy Execution Readiness desactivado (IMPETUS_POLICY_READINESS_ENABLED).',
        code: 'POLICY_READINESS_DISABLED'
      });
    }
    const { snapshot, demo_readiness } =
      cognitivePolicyExecutionReadinessService.generatePolicyExecutionReadinessAdminPayload();
    return res.json({ ok: true, snapshot, demo_readiness });
  } catch (e) {
    try {
      console.warn('[POLICY_READINESS]', { route: 'policy-readiness', message: e?.message || e });
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'policy_readiness_failed' });
  }
});

/** GET /policy-simulation — simulação normativa read-only: snapshot + demo (admin). */
router.get('/policy-simulation', ...policyDiscoveryAdmin, async (req, res) => {
  try {
    if (!cognitivePolicySimulationRuntimeService.isPolicySimulationEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Policy Simulation Runtime desactivado (IMPETUS_POLICY_SIMULATION_ENABLED).',
        code: 'POLICY_SIMULATION_DISABLED'
      });
    }
    const { snapshot, demo_simulation } = cognitivePolicySimulationRuntimeService.generatePolicySimulationAdminPayload();
    return res.json({ ok: true, snapshot, demo_simulation });
  } catch (e) {
    try {
      console.warn('[POLICY_SIMULATION]', { route: 'policy-simulation', message: e?.message || e });
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'policy_simulation_failed' });
  }
});

/** GET /policy-sandbox — execução sandbox shadow (admin; não altera produção). */
router.get('/policy-sandbox', ...policyDiscoveryAdmin, async (req, res) => {
  try {
    if (!cognitivePolicySandboxRuntimeService.isPolicySandboxEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Policy Sandbox desactivado (IMPETUS_POLICY_SANDBOX_ENABLED).',
        code: 'POLICY_SANDBOX_DISABLED'
      });
    }
    const { snapshot, demo_sandbox } = cognitivePolicySandboxRuntimeService.generatePolicySandboxAdminPayload();
    return res.json({ ok: true, snapshot, demo_sandbox });
  } catch (e) {
    try {
      console.warn('[POLICY_SANDBOX]', { route: 'policy-sandbox', message: e?.message || e });
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'policy_sandbox_failed' });
  }
});

/** GET /policy-diff — diff engine governança produção vs sandbox (admin; só análise, sem runtime real). */
router.get('/policy-diff', ...policyDiscoveryAdmin, async (req, res) => {
  try {
    if (!cognitivePolicyGovernanceDiffService.isPolicyDiffEnabled()) {
      return res.status(403).json({
        ok: false,
        code: 'POLICY_DIFF_DISABLED',
        error: 'Policy Governance Diff desactivado (IMPETUS_POLICY_DIFF_ENABLED).'
      });
    }
    const { snapshot, demo_diff } = cognitivePolicyGovernanceDiffService.generatePolicyGovernanceDiffAdminPayload();
    return res.json({ ok: true, snapshot, demo_diff });
  } catch (e) {
    try {
      console.warn('[POLICY_DIFF]', { route: 'policy-diff', message: e?.message || e });
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'policy_diff_failed' });
  }
});

/** GET /policy-evolution — evolution engine governança (admin; só observação temporal, sem runtime real). */
router.get('/policy-evolution', ...policyDiscoveryAdmin, async (req, res) => {
  try {
    if (!cognitivePolicyGovernanceEvolutionService.isPolicyEvolutionEnabled()) {
      return res.status(403).json({
        ok: false,
        code: 'POLICY_EVOLUTION_DISABLED',
        error: 'Policy Governance Evolution desactivado (IMPETUS_POLICY_EVOLUTION_ENABLED).'
      });
    }
    const { snapshot, demo_evolution } = cognitivePolicyGovernanceEvolutionService.generatePolicyGovernanceEvolutionAdminPayload();
    return res.json({ ok: true, snapshot, demo_evolution });
  } catch (e) {
    try {
      console.warn('[POLICY_EVOLUTION]', { route: 'policy-evolution', message: e?.message || e });
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'policy_evolution_failed' });
  }
});

/** GET /legacy-runtime — governança de caminhos legacy (rolling + readiness). */
router.get('/legacy-runtime', ...adminOnly, async (req, res) => {
  try {
    if (!aiAnalyticsService.isGovernanceDashboardEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Painel de governança cognitiva desactivado (IMPETUS_COGNITIVE_DASHBOARD_ENABLED).',
        code: 'DASHBOARD_DISABLED'
      });
    }
    return res.json({ ok: true, legacy_runtime: unifiedOrchestrator.getLegacyRuntimeDashboard() });
  } catch (e) {
    try {
      console.warn('[OPERATIONAL_HARDENING]', e?.message || e);
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'legacy_runtime_failed' });
  }
});

/** GET /integrity-readiness — rollout seguro do block mode (só leitura; não altera env). */
router.get('/integrity-readiness', ...adminOnly, async (req, res) => {
  try {
    if (!aiAnalyticsService.isGovernanceDashboardEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Painel de governança cognitiva desactivado (IMPETUS_COGNITIVE_DASHBOARD_ENABLED).',
        code: 'DASHBOARD_DISABLED'
      });
    }
    const integrity_rollout_readiness = contextIntegrityService.evaluateIntegrityBlockReadiness({ silent_logs: false });
    return res.json({ ok: true, integrity_rollout_readiness });
  } catch (e) {
    try {
      console.warn('[OPERATIONAL_HARDENING]', e?.message || e);
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'integrity_readiness_failed' });
  }
});

/** GET /event-queue-health — fila diferida do backbone (backpressure / drops). */
router.get('/event-queue-health', ...adminOnly, async (req, res) => {
  try {
    if (!aiAnalyticsService.isGovernanceDashboardEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Painel de governança cognitiva desactivado (IMPETUS_COGNITIVE_DASHBOARD_ENABLED).',
        code: 'DASHBOARD_DISABLED'
      });
    }
    return res.json({ ok: true, event_queue_health: cognitiveEventBackboneService.getEventQueueHealth() });
  } catch (e) {
    try {
      console.warn('[OPERATIONAL_HARDENING]', e?.message || e);
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'event_queue_health_failed' });
  }
});

/** GET /events/metrics — métricas do backbone de eventos cognitivos. */
router.get('/events/metrics', ...adminOnly, async (req, res) => {
  try {
    if (!aiAnalyticsService.isGovernanceDashboardEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Painel de governança cognitiva desactivado (IMPETUS_COGNITIVE_DASHBOARD_ENABLED).',
        code: 'DASHBOARD_DISABLED'
      });
    }
    return res.json(cognitiveEventBackboneService.getAdminMetricsPayload());
  } catch (e) {
    try {
      console.warn('[EVENT_BACKBONE_ADMIN]', e?.message || e);
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'event_backbone_metrics_failed' });
  }
});

/** GET /events/timeline/:traceId — timeline e correlação por trace. */
router.get('/events/timeline/:traceId', ...adminOnly, async (req, res) => {
  try {
    if (!aiAnalyticsService.isGovernanceDashboardEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Painel de governança cognitiva desactivado (IMPETUS_COGNITIVE_DASHBOARD_ENABLED).',
        code: 'DASHBOARD_DISABLED'
      });
    }
    const traceId = req.params.traceId != null ? String(req.params.traceId).trim() : '';
    if (!traceId) {
      return res.status(400).json({ ok: false, error: 'traceId obrigatório' });
    }
    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const out = await cognitiveEventBackboneService.correlateCognitiveEvents(traceId, { companyId });
    return res.json({ ok: true, ...out });
  } catch (e) {
    try {
      console.warn('[EVENT_BACKBONE_ADMIN]', e?.message || e);
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'event_timeline_failed' });
  }
});

/** GET /events/replay/:traceId — replay temporal (eventos ordenados). */
router.get('/events/replay/:traceId', ...adminOnly, async (req, res) => {
  try {
    if (!aiAnalyticsService.isGovernanceDashboardEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Painel de governança cognitiva desactivado (IMPETUS_COGNITIVE_DASHBOARD_ENABLED).',
        code: 'DASHBOARD_DISABLED'
      });
    }
    const traceId = req.params.traceId != null ? String(req.params.traceId).trim() : '';
    if (!traceId) {
      return res.status(400).json({ ok: false, error: 'traceId obrigatório' });
    }
    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
    const out = await cognitiveEventBackboneService.replayEventsByTrace(traceId, { companyId, limit });
    cognitiveEventBackboneService.publishCognitiveEventDeferred({
      event_type: cognitiveEventBackboneService.EVENT_TYPES.REPLAY_EXECUTION,
      trace_id: traceId,
      company_id: companyId,
      channel: 'admin_api',
      runtime: 'admin_learning',
      context_hash: null,
      payload: { source: 'GET /events/replay', event_count: (out.events || []).length },
      metadata: { user_id: req.user?.id || null }
    });
    return res.json({ ok: true, ...out });
  } catch (e) {
    try {
      console.warn('[EVENT_BACKBONE_ADMIN]', e?.message || e);
    } catch (_e2) {}
    return res.status(500).json({ ok: false, error: 'event_replay_failed' });
  }
});

/**
 * POST /consensus/analyze — compara outputs de múltiplas IAs (observacional; opcional persistência no event store).
 */
router.post('/consensus/analyze', ...adminOnly, jsonBody, async (req, res) => {
  try {
    if (!cognitiveConsensusService.isConsensusEngineEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Engine de consenso desactivado (IMPETUS_COGNITIVE_CONSENSUS_ENABLED).',
        code: 'CONSENSUS_DISABLED'
      });
    }

    const participants = req.body?.participants;
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Informe participants (array não vazio).',
        code: 'INVALID_PARTICIPANTS'
      });
    }

    const report = await cognitiveConsensusService.generateConsensusReport({ participants });
    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;

    const payload = {
      report: {
        consensus_score: report.consensus_score,
        divergence_detected: report.divergence_detected,
        confidence: report.confidence,
        narrative: report.narrative,
        participants_summary: report.participants_summary,
        weighted_voting: report.weighted_voting
      },
      participants_redacted: participants.map((p) => ({
        engine: p?.engine != null ? String(p.engine).slice(0, 128) : null,
        confidence: p?.confidence,
        output:
          p?.output != null
            ? String(p.output).slice(0, 12000)
            : ''
      }))
    };

    await cognitiveDbPersistenceService.persistConsensusEventToDb({
      companyId,
      consensus_score: report.consensus_score,
      divergence_detected: report.divergence_detected,
      payload
    });

    return res.json({ ok: true, report });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_CONSENSUS_ERROR]', { route: 'consensus/analyze', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'consensus_analyze_failed' });
  }
});

/** GET /consensus/events — eventos de consenso recentes (tenant). Query: limit */
router.get('/consensus/events', ...adminOnly, async (req, res) => {
  try {
    if (!cognitiveConsensusService.isConsensusEngineEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Engine de consenso desactivado (IMPETUS_COGNITIVE_CONSENSUS_ENABLED).',
        code: 'CONSENSUS_DISABLED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const events = await cognitiveDbPersistenceService.listConsensusEventsForCompany(
      companyId,
      req.query.limit
    );

    return res.json({ ok: true, events });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_CONSENSUS_ERROR]', { route: 'consensus/events', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'consensus_events_failed' });
  }
});

/**
 * GET /voting/config — pesos efectivos e flag (só leitura; sem segredos).
 */
router.get('/voting/config', ...adminOnly, async (req, res) => {
  try {
    return res.json({
      ok: true,
      enabled: cognitiveVotingService.isWeightedVotingEnabled(),
      default_weights: { ...cognitiveVotingService.DEFAULT_WEIGHTS },
      resolved_weights: cognitiveVotingService.getResolvedWeights()
    });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_VOTING_ERROR]', { route: 'voting/config', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'voting_config_failed' });
  }
});

/**
 * POST /voting/analyze — métrica ponderada observacional (não altera decisões).
 */
router.post('/voting/analyze', ...adminOnly, jsonBody, async (req, res) => {
  try {
    if (!cognitiveVotingService.isWeightedVotingEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Votação ponderada desactivada (IMPETUS_WEIGHTED_VOTING_ENABLED).',
        code: 'VOTING_DISABLED'
      });
    }

    const participants = req.body?.participants;
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Informe participants (array não vazio).',
        code: 'INVALID_PARTICIPANTS'
      });
    }

    const weightsOverride =
      req.body?.weights && typeof req.body.weights === 'object' && !Array.isArray(req.body.weights)
        ? req.body.weights
        : undefined;

    const report = await cognitiveVotingService.generateWeightedVotingReport({
      participants,
      weights: weightsOverride
    });

    return res.json({
      ok: true,
      weighted_consensus: report.weighted_consensus,
      dominant_engine: report.dominant_engine ?? report.dominance?.dominant_engine ?? null,
      dominance: report.dominance,
      weights_snapshot: report.weights_snapshot
    });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_VOTING_ERROR]', { route: 'voting/analyze', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'voting_analyze_failed' });
  }
});

/**
 * POST /calibration/analyze — relatório de calibração (observacional; opcional persistência).
 */
router.post('/calibration/analyze', ...adminOnly, jsonBody, async (req, res) => {
  try {
    if (!confidenceCalibrationService.isConfidenceCalibrationEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Calibração de confiança desactivada (IMPETUS_CONFIDENCE_CALIBRATION_ENABLED).',
        code: 'CALIBRATION_DISABLED'
      });
    }

    const { confidence, consensusScore, driftDetected } = req.body || {};
    if (
      confidence == null ||
      consensusScore == null ||
      driftDetected == null ||
      typeof driftDetected !== 'boolean'
    ) {
      return res.status(400).json({
        ok: false,
        error: 'Informe confidence, consensusScore e driftDetected (booleano).',
        code: 'INVALID_CALIBRATION_INPUT'
      });
    }

    const report = await confidenceCalibrationService.generateCalibrationReport({
      confidence: Number(confidence),
      consensusScore: Number(consensusScore),
      driftDetected
    });

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const payload = {
      input: {
        confidence: Number(confidence),
        consensusScore: Number(consensusScore),
        driftDetected
      },
      report
    };

    await cognitiveDbPersistenceService.persistCalibrationEventToDb({
      companyId,
      calibrated_confidence: report.calibrated_confidence,
      overconfidence: report.overconfidence,
      underconfidence: report.underconfidence,
      payload
    });

    return res.json({ ok: true, report });
  } catch (e) {
    try {
      console.warn('[CONFIDENCE_CALIBRATION_ERROR]', { route: 'calibration/analyze', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'calibration_analyze_failed' });
  }
});

/** GET /calibration/events — eventos de calibração recentes (tenant). Query: limit */
router.get('/calibration/events', ...adminOnly, async (req, res) => {
  try {
    if (!confidenceCalibrationService.isConfidenceCalibrationEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Calibração de confiança desactivada (IMPETUS_CONFIDENCE_CALIBRATION_ENABLED).',
        code: 'CALIBRATION_DISABLED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const events = await cognitiveDbPersistenceService.listCalibrationEventsForCompany(
      companyId,
      req.query.limit
    );

    return res.json({ ok: true, events });
  } catch (e) {
    try {
      console.warn('[CONFIDENCE_CALIBRATION_ERROR]', { route: 'calibration/events', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'calibration_events_failed' });
  }
});

/** GET /csi/current — Cognitive Stability Index actual (observacional; regista snapshot se BD activo). */
router.get('/csi/current', ...adminOnly, async (req, res) => {
  try {
    if (!cognitiveStabilityService.isCsiEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Cognitive Stability Index desactivado (IMPETUS_CSI_ENABLED).',
        code: 'CSI_DISABLED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const snapshot = await aiAnalyticsService.getCognitiveStabilitySnapshot(companyId);

    const payload = {
      snapshot,
      at: new Date().toISOString()
    };
    await cognitiveDbPersistenceService.persistCsiEventToDb({
      companyId,
      csi: snapshot.csi,
      status: snapshot.status || 'unknown',
      payload
    });

    return res.json({ ok: true, ...snapshot });
  } catch (e) {
    try {
      console.warn('[CSI_ERROR]', { route: 'csi/current', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'csi_current_failed' });
  }
});

/** GET /csi/history — histórico de eventos CSI (tenant). Query: limit */
router.get('/csi/history', ...adminOnly, async (req, res) => {
  try {
    if (!cognitiveStabilityService.isCsiEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Cognitive Stability Index desactivado (IMPETUS_CSI_ENABLED).',
        code: 'CSI_DISABLED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const events = await cognitiveDbPersistenceService.listCsiEventsForCompany(
      companyId,
      req.query.limit
    );

    return res.json({ ok: true, events });
  } catch (e) {
    try {
      console.warn('[CSI_ERROR]', { route: 'csi/history', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'csi_history_failed' });
  }
});

/** GET /strategic/patterns — padrões detectados na memória operacional (só leitura). */
router.get('/strategic/patterns', ...adminOnly, (req, res) => {
  try {
    const patterns = strategicLearningService.analyzeSystemPatterns();
    return res.json({ ok: true, patterns });
  } catch (e) {
    console.error('[ADMIN_LEARNING_STRATEGIC_PATTERNS]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/** GET /proposals — lista propostas (memória do processo). */
router.get('/proposals', ...adminOnly, (req, res) => {
  try {
    return res.json({ ok: true, proposals: supervisedLearningService.getProposals() });
  } catch (e) {
    console.error('[ADMIN_LEARNING_PROPOSALS]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/**
 * POST /scan — gera sugestões a partir da memória operacional e regista pendentes.
 */
router.post('/scan', ...adminOnly, jsonBody, (req, res) => {
  try {
    const { createdIds } = supervisedLearningService.scanAndStorePendingProposals();
    return res.json({ ok: true, createdIds });
  } catch (e) {
    console.error('[ADMIN_LEARNING_SCAN]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/** POST /approve — aprova proposta e aplica ajustes aprovados (runtime, auditável). */
router.post('/approve', ...adminOnly, jsonBody, (req, res) => {
  try {
    const id = req.body?.id;
    if (id == null) {
      return res.status(400).json({ ok: false, error: 'Informe id da proposta.' });
    }
    const updated = supervisedLearningService.approveProposal(id, { userId: req.user?.id });
    if (!updated) {
      return res.status(404).json({ ok: false, error: 'Proposta não encontrada ou já processada.' });
    }
    return res.json({ ok: true, proposal: updated });
  } catch (e) {
    console.error('[ADMIN_LEARNING_APPROVE]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/** POST /reject — rejeita proposta pendente (sem aplicar ajuste). */
router.post('/reject', ...adminOnly, jsonBody, (req, res) => {
  try {
    const id = req.body?.id;
    if (id == null) {
      return res.status(400).json({ ok: false, error: 'Informe id da proposta.' });
    }
    const updated = supervisedLearningService.rejectProposal(id, { userId: req.user?.id });
    if (!updated) {
      return res.status(404).json({ ok: false, error: 'Proposta não encontrada ou já processada.' });
    }
    return res.json({ ok: true, proposal: updated });
  } catch (e) {
    console.error('[ADMIN_LEARNING_REJECT]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/** POST /adjustments/clear — rollback: remove ajustes supervisionados aplicados em memória. */
router.post('/adjustments/clear', ...adminOnly, jsonBody, (req, res) => {
  try {
    adaptiveTuningService.clearApprovedLearningAdjustments();
    return res.json({ ok: true, adjustments: adaptiveTuningService.getApprovedLearningAdjustments() });
  } catch (e) {
    console.error('[ADMIN_LEARNING_CLEAR]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/** GET /adjustments — estado actual dos ajustes aplicados (leitura). */
router.get('/adjustments', ...adminOnly, (req, res) => {
  try {
    return res.json({ ok: true, adjustments: adaptiveTuningService.getApprovedLearningAdjustments() });
  } catch (e) {
    console.error('[ADMIN_LEARNING_ADJ_GET]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/**
 * GET /replay/:id — reconstrução histórica (só leitura, sem IA). Query: compare=1, currentConfidence, currentDataState
 */
router.get('/replay/:id', ...adminOnly, async (req, res) => {
  try {
    if (!cognitiveReplayService.isReplayEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Replay cognitivo desactivado (IMPETUS_COGNITIVE_REPLAY_ENABLED).',
        code: 'REPLAY_DISABLED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const replay = await cognitiveReplayService.replayInteraction(req.params.id, companyId);

    if (replay.error === 'REPLAY_DISABLED') {
      return res.status(403).json({ ok: false, error: replay.error, code: replay.error });
    }
    if (replay.error === 'COGNITIVE_DB_DISABLED') {
      return res.status(503).json({ ok: false, error: replay.error, code: replay.error });
    }
    if (replay.error === 'INTERACTION_NOT_FOUND') {
      return res.status(404).json({ ok: false, error: replay.error, code: replay.error });
    }
    if (replay.error === 'REPLAY_FAILED') {
      return res.status(500).json({ ok: false, error: replay.error, code: replay.error });
    }

    let comparison = null;
    const cmp = String(req.query.compare || '').toLowerCase();
    if (cmp === '1' || cmp === 'true' || cmp === 'yes') {
      comparison = cognitiveReplayService.compareReplayWithCurrent(replay, {
        confidence:
          req.query.currentConfidence != null && req.query.currentConfidence !== ''
            ? Number(req.query.currentConfidence)
            : null,
        data_state:
          req.query.currentDataState != null && String(req.query.currentDataState).length > 0
            ? String(req.query.currentDataState)
            : null
      });
    }

    return res.json({ ok: true, replay, comparison });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_REPLAY_ERROR]', { route: 'replay', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'replay_failed' });
  }
});

/**
 * GET /snapshot?date= — contagens cumulativas até à data (ISO), só leitura.
 */
router.get('/snapshot', ...adminOnly, async (req, res) => {
  try {
    if (!cognitiveReplayService.isReplayEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Replay cognitivo desactivado (IMPETUS_COGNITIVE_REPLAY_ENABLED).',
        code: 'REPLAY_DISABLED'
      });
    }

    const date = req.query.date;
    if (date == null || String(date).trim() === '') {
      return res.status(400).json({ ok: false, error: 'Informe date (ISO 8601).' });
    }

    const snapshot = await cognitiveReplayService.getCognitiveSnapshotAt(String(date).trim());
    if (snapshot.error === 'REPLAY_DISABLED' || snapshot.error === 'COGNITIVE_DB_DISABLED') {
      return res.status(503).json({ ok: false, error: snapshot.error, code: snapshot.error });
    }
    if (snapshot.error === 'INVALID_DATE') {
      return res.status(400).json({ ok: false, error: 'INVALID_DATE' });
    }
    if (snapshot.error === true) {
      return res.status(500).json({ ok: false, error: 'snapshot_failed' });
    }

    return res.json({ ok: true, snapshot });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_REPLAY_ERROR]', { route: 'snapshot', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'snapshot_failed' });
  }
});

/**
 * GET /drift/report/:interactionId — relatório de drift (baseline = replay; actual = query).
 * Query: currentConfidence, currentDataState, currentNarrative, baselineNarrative (opcional)
 */
router.get('/drift/report/:interactionId', ...adminOnly, async (req, res) => {
  try {
    if (!cognitiveDriftService.isDriftDetectionEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Detecção de drift desactivada (IMPETUS_COGNITIVE_DRIFT_ENABLED).',
        code: 'DRIFT_DISABLED'
      });
    }

    if (!cognitiveReplayService.isReplayEnabled()) {
      return res.status(503).json({
        ok: false,
        error: 'Replay cognitivo necessário para baseline (IMPETUS_COGNITIVE_REPLAY_ENABLED).',
        code: 'REPLAY_REQUIRED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const replay = await cognitiveReplayService.replayInteraction(
      req.params.interactionId,
      companyId
    );

    if (replay.error === 'REPLAY_DISABLED') {
      return res.status(403).json({ ok: false, error: replay.error, code: replay.error });
    }
    if (replay.error === 'COGNITIVE_DB_DISABLED') {
      return res.status(503).json({ ok: false, error: replay.error, code: replay.error });
    }
    if (replay.error === 'INTERACTION_NOT_FOUND') {
      return res.status(404).json({ ok: false, error: replay.error, code: replay.error });
    }
    if (replay.error === 'REPLAY_FAILED') {
      return res.status(500).json({ ok: false, error: replay.error, code: replay.error });
    }

    const current = {
      confidence:
        req.query.currentConfidence != null && req.query.currentConfidence !== ''
          ? Number(req.query.currentConfidence)
          : null,
      data_state:
        req.query.currentDataState != null && String(req.query.currentDataState).trim() !== ''
          ? String(req.query.currentDataState).trim()
          : null,
      currentNarrative:
        req.query.currentNarrative != null ? String(req.query.currentNarrative) : '',
      previousNarrative:
        req.query.baselineNarrative != null ? String(req.query.baselineNarrative) : ''
    };

    const report = await cognitiveDriftService.generateDriftReport({ replay, current });
    cognitiveDriftService.schedulePersistDriftReport(companyId, report, req.params.interactionId);

    return res.json({
      ok: true,
      interactionId: req.params.interactionId,
      report
    });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_DRIFT_ERROR]', { route: 'drift/report', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'drift_report_failed' });
  }
});

/** GET /drift/events — eventos de drift recentes (tenant). Query: limit */
router.get('/drift/events', ...adminOnly, async (req, res) => {
  try {
    if (!cognitiveDriftService.isDriftDetectionEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Detecção de drift desactivada (IMPETUS_COGNITIVE_DRIFT_ENABLED).',
        code: 'DRIFT_DISABLED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const events = await cognitiveDbPersistenceService.listDriftEventsForCompany(
      companyId,
      req.query.limit
    );

    return res.json({ ok: true, events });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_DRIFT_ERROR]', { route: 'drift/events', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'drift_events_failed' });
  }
});

module.exports = router;
