'use strict';

/**
 * GET /admin/runtime/flags/effective
 * GET /admin/runtime/flags/diagnostics
 * GET /admin/runtime/flags/conflicts
 *
 * Admin-only, read-only, never cached.
 * Expõe snapshot de flags efetivas e diagnostics de reconciliação.
 */

const express = require('express');
const router = express.Router();

router.get('/flags/effective', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');

  try {
    const flagReconciler = require('../../governance/flagReconcilerRuntime');
    const effective = flagReconciler.getEffectiveFlags();
    res.json({ ok: true, effective, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/flags/diagnostics', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');

  try {
    const flagReconciler = require('../../governance/flagReconcilerRuntime');
    const diagnostics = flagReconciler.getRuntimeDiagnostics();
    res.json({ ok: true, ...diagnostics });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/flags/conflicts', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');

  try {
    const flagReconciler = require('../../governance/flagReconcilerRuntime');
    const matrix = flagReconciler.getConflictMatrix();
    res.json({ ok: true, ...matrix });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/state-classification', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');

  try {
    const rsc = require('../../governance/runtimeStateClassification');
    res.json({
      ok: true,
      stages: rsc.STAGES,
      stats: rsc.getStageStats(),
      classifications: rsc.getClassificationMap(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/state-enforcement', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');

  try {
    const { getEnforcementStats } = require('../../middleware/runtimeStateEnforcementMiddleware');
    res.json({ ok: true, ...getEnforcementStats(), timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/retention-registry', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');

  try {
    const registry = require('../../governance/retentionPolicyRegistry');
    const filter = req.query.filter;
    const table = req.query.table;

    if (table) {
      const policy = registry.getPolicy(table);
      return res.json({ ok: true, policy: policy || null, timestamp: new Date().toISOString() });
    }

    if (filter === 'pii') return res.json({ ok: true, policies: registry.getPiiTables(), timestamp: new Date().toISOString() });
    if (filter === 'dsr') return res.json({ ok: true, policies: registry.getDsrErasableTables(), timestamp: new Date().toISOString() });
    if (filter === 'immutable') return res.json({ ok: true, policies: registry.getImmutableTables(), timestamp: new Date().toISOString() });
    if (filter === 'purge') return res.json({ ok: true, policies: registry.getPoliciesByAction('purge'), timestamp: new Date().toISOString() });
    if (filter === 'anonymize') return res.json({ ok: true, policies: registry.getPoliciesByAction('anonymize'), timestamp: new Date().toISOString() });

    res.json({ ok: true, diagnostics: registry.getDiagnostics(), stats: registry.getRegistryStats(), timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/retention-shadow', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const worker = require('../../workers/retentionShadowWorker');
    const stats = worker.getWorkerStats();
    const lastScan = worker.getLastScan();
    res.json({ ok: true, ...stats, last_scan_detail: lastScan, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/retention-shadow/scan', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const worker = require('../../workers/retentionShadowWorker');
    if (!worker.isShadowEnabled()) {
      return res.status(503).json({ ok: false, error: 'Retention mode is off', mode: worker.getRetentionMode() });
    }
    worker.executeShadowScan().then(result => {
      res.json(result);
    }).catch(err => {
      res.status(500).json({ ok: false, error: err?.message });
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// Aliases canónicos (T1.7.2 spec)
router.get('/retention/status', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    const shadow = require('../../workers/retentionShadowWorker');
    const pilot = require('../../workers/retentionPilotWorker');
    const enforce = require('../../workers/retentionEnforceWorker');
    res.json({
      ok: true,
      mode: shadow.getRetentionMode(),
      shadow: shadow.getWorkerStats(),
      pilot: pilot.getPilotStats(),
      enforce: enforce.getEnforceStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/retention/run', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const mode = req.query.mode || req.body?.mode || 'shadow';
  try {
    if (mode === 'shadow') {
      const worker = require('../../workers/retentionShadowWorker');
      if (!worker.isShadowEnabled()) {
        return res.status(503).json({ ok: false, error: 'Retention mode is off', current_mode: worker.getRetentionMode() });
      }
      const result = await worker.executeShadowScan();
      return res.json(result);
    }
    if (mode === 'pilot') {
      const pilot = require('../../workers/retentionPilotWorker');
      if (!pilot.isPilotMode()) {
        return res.status(503).json({ ok: false, error: 'Not in pilot mode' });
      }
      const result = await pilot.executePilotRun();
      return res.json(result);
    }
    if (mode === 'enforce') {
      const enforce = require('../../workers/retentionEnforceWorker');
      if (!enforce.isEnforceMode()) {
        return res.status(503).json({ ok: false, error: 'Not in enforce mode' });
      }
      const result = await enforce.executeEnforceRun();
      return res.json(result);
    }
    res.status(400).json({ ok: false, error: 'Invalid mode. Use: shadow | pilot | enforce' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/retention-pilot', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const pilot = require('../../workers/retentionPilotWorker');
    const stats = pilot.getPilotStats();
    const lastRun = pilot.getLastPilotRun();
    res.json({ ok: true, ...stats, last_run_detail: lastRun, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/retention-pilot/run', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const pilot = require('../../workers/retentionPilotWorker');
    if (!pilot.isPilotMode()) {
      return res.status(503).json({ ok: false, error: 'Not in pilot mode', mode: process.env.IMPETUS_RETENTION_MODE });
    }
    pilot.executePilotRun().then(result => {
      res.json(result);
    }).catch(err => {
      res.status(500).json({ ok: false, error: err?.message });
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/retention-enforce', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const enforce = require('../../workers/retentionEnforceWorker');
    const stats = enforce.getEnforceStats();
    const lastRun = enforce.getLastEnforceRun();
    res.json({ ok: true, ...stats, last_run_detail: lastRun, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/retention-enforce/run', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const enforce = require('../../workers/retentionEnforceWorker');
    if (!enforce.isEnforceMode()) {
      return res.status(503).json({ ok: false, error: 'Not in enforce mode', mode: process.env.IMPETUS_RETENTION_MODE });
    }
    enforce.executeEnforceRun().then(result => {
      res.json(result);
    }).catch(err => {
      res.status(500).json({ ok: false, error: err?.message });
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/ai-anonymization', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const svc = require('../../services/aiAnonymizationService');
    res.json({ ok: true, ...svc.getDiagnostics(), timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/ai-anonymization/run', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const svc = require('../../services/aiAnonymizationService');
    if (!svc.isEnabled()) {
      return res.status(503).json({ ok: false, error: 'AI Anonymization disabled', mode: svc.getAnonymizationMode() });
    }

    const { user_id } = req.body || {};
    const company_id = req.user?.company_id;
    if (!user_id || !company_id) {
      return res.status(400).json({ ok: false, error: 'user_id obrigatório; company_id do token' });
    }

    const result = await svc.executeFullPipeline(user_id, company_id, {
      correlationId: req.headers['x-correlation-id'],
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/ai-anonymization/worker', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    const worker = require('../../workers/aiAnonymizationWorker');
    const stats = worker.getWorkerStats();
    const lastRun = worker.getLastRun();
    res.json({ ok: true, ...stats, last_run_detail: lastRun, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/ai-anonymization/worker/run', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    const worker = require('../../workers/aiAnonymizationWorker');
    const result = await worker.executeWorkerRun();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── SZ5 Anonymization (PROMPT 10) ─────────────────────────────────────────

router.get('/sz5-anonymization', (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const cognitivePurge = require('../../services/sz5CognitivePurgeService');
    const graphPurge = require('../../services/sz5GraphPurgeService');
    const crossThread = require('../../workers/sz5CrossThreadAnonymizerWorker');
    res.json({
      ok: true,
      cognitive_purge: cognitivePurge.getDiagnostics(),
      graph_purge: graphPurge.getDiagnostics(),
      cross_thread_worker: crossThread.getWorkerStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/sz5-anonymization/run', async (req, res) => {
  try {
    const crossThread = require('../../workers/sz5CrossThreadAnonymizerWorker');
    const result = await crossThread.executeWorkerRun();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/sz5-anonymization/purge', async (req, res) => {
  try {
    const cognitivePurge = require('../../services/sz5CognitivePurgeService');
    const { subject_token, tenant_id, user_id } = req.body || {};
    if (!tenant_id || !user_id) {
      return res.status(400).json({ ok: false, error: 'tenant_id and user_id required' });
    }
    const token = subject_token || `manual_${Date.now()}`;
    const result = await cognitivePurge.executeFullCognitivePurge(token, tenant_id, user_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── SZ5 Activation Governance (T1.7) ───────────────────────────────────────

router.get('/sz5-activation', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const governance = require('../../governance/sz5ActivationGovernance');
    const diagnostics = governance.getDiagnostics();
    const phase1 = await governance.validatePhase1Preconditions();
    res.json({ ok: true, diagnostics, phase_1_validation: phase1, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/sz5-activation/phase1', async (req, res) => {
  try {
    const governance = require('../../governance/sz5ActivationGovernance');
    const result = await governance.attemptPhase1Activation();
    res.status(result.ok ? 200 : 403).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/sz5-activation/phase2/validate', async (req, res) => {
  try {
    const governance = require('../../governance/sz5ActivationGovernance');
    const result = await governance.validatePhase2Preconditions();
    res.status(result.all_passed ? 200 : 403).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── Retention Worker Unified (T1.7) ────────────────────────────────────────

router.get('/retention-worker', (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const worker = require('../../workers/retentionWorker');
    res.json({ ok: true, ...worker.getWorkerStats(), timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/retention-worker/run', async (req, res) => {
  try {
    const worker = require('../../workers/retentionWorker');
    const result = await worker.executeRun();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/retention-eligibility', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const resolver = require('../../governance/retentionEligibilityResolver');
    const tenantId = req.query.tenant_id || null;
    const result = await resolver.resolveAll({ tenantId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── KMS Governance (PROMPT 11) ─────────────────────────────────────────────

router.get('/kms', (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const kmsGov = require('../../services/kms/kmsGovernanceService');
    const colEnc = require('../../services/kms/columnEncryptionService');
    res.json({
      ok: true,
      governance: kmsGov.getDiagnostics(),
      column_encryption: colEnc.getDiagnostics(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/kms/metrics', (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const kmsGov = require('../../services/kms/kmsGovernanceService');
    res.json({ ok: true, metrics: kmsGov.getMetrics(), timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/kms/rotation', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const kmsGov = require('../../services/kms/kmsGovernanceService');
    const status = await kmsGov.checkRotationNeeded();
    res.json({ ok: true, ...status, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/kms/rotation/emit', async (req, res) => {
  try {
    const kmsGov = require('../../services/kms/kmsGovernanceService');
    await kmsGov.emitRotationEvent({ type: 'manual', triggered_by: req.user?.id || 'admin' });
    res.json({ ok: true, message: 'Rotation event emitted to audit trail' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/kms/cache/invalidate', (req, res) => {
  try {
    const kmsGov = require('../../services/kms/kmsGovernanceService');
    kmsGov.invalidateKeyCache();
    res.json({ ok: true, message: 'Key cache invalidated — next operation will reload keys' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── AI Model Registry + Governance (PROMPT 12) ─────────────────────────────

router.get('/ai-governance', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const registry = require('../../governance/aiModelRegistry');
    const gov = require('../../services/aiGovernancePersistenceService');
    res.json({
      ok: true,
      registry: registry.getDiagnostics(),
      models_count: (await registry.listModels()).length,
      iso42001: await gov.getIso42001ReadinessReport(req.query.company_id || null),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/ai-governance/sync-registry', async (req, res) => {
  try {
    const schemaBootstrap = require('../../services/aiSchemaBootstrap');
    const registry = require('../../governance/aiModelRegistry');
    await schemaBootstrap.ensureAiGovernanceSchema();
    const sync = await registry.syncRegistryToDatabase();
    res.json({ ok: true, sync });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/ai-governance/iso42001', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const gov = require('../../services/aiGovernancePersistenceService');
    const report = await gov.getIso42001ReadinessReport(req.query.company_id || null);
    res.json(report);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── Hallucination Detection V1 (PROMPT 13) ─────────────────────────────────

router.get('/hallucination-detection', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const svc = require('../../services/hallucinationDetectionService');
    const metrics = require('../../services/hallucinationMetricsService');
    res.json({
      ok: true,
      diagnostics: svc.getDiagnostics(),
      metrics: metrics.getMetrics(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/hallucination-detection/review-queue', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'company_id required' });
    const queue = require('../../services/hallucinationReviewQueueService');
    const result = await queue.listReviewQueue(companyId, { limit: req.query.limit });
    res.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/hallucination-detection/false-positive', async (req, res) => {
  try {
    const { trace_id, company_id, reason } = req.body || {};
    const companyId = company_id || req.user?.company_id;
    if (!trace_id || !companyId) {
      return res.status(400).json({ ok: false, error: 'trace_id and company_id required' });
    }
    const queue = require('../../services/hallucinationReviewQueueService');
    const result = await queue.markFalsePositive(trace_id, companyId, {
      user_id: req.user?.id,
      reason,
    });
    res.json({ ok: result.ok, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/hallucination-detection/bootstrap-schema', async (req, res) => {
  try {
    const schemaBootstrap = require('../../services/aiSchemaBootstrap');
    const result = await schemaBootstrap.ensureAiGovernanceSchema();
    res.json({ ok: result.ok, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── OpenTelemetry + Prometheus + Grafana (PROMPT 14) ─────────────────────────

router.get('/observability-apm', (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const apm = require('../../observability/apmEnterpriseBridge');
    const obsV2 = require('../../observability/enterpriseObservabilityV2Runtime');
    const slo = require('../../observability/sloSliRegistry');
    res.json({
      ok: true,
      apm: apm.getDiagnostics(),
      observability_v2: obsV2.getHealth(),
      slos: slo.evaluateSlos(),
      grafana_stack: process.env.IMPETUS_GRAFANA_STACK_ENABLED === 'true',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/observability-prometheus-preview', (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const obsV2 = require('../../observability/enterpriseObservabilityV2Runtime');
    const flags = require('../../observability/observabilityFlags');
    if (!flags.isPrometheusEndpointEnabled()) {
      return res.status(403).json({ ok: false, error: 'IMPETUS_PROMETHEUS_ENDPOINT_ENABLED=false' });
    }
    const text = obsV2.exportPrometheus();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(text.slice(0, 8000) + (text.length > 8000 ? '\n# ... truncated' : ''));
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── SZ4 Persistence (PROMPT 15) ─────────────────────────────────────────────

router.get('/sz4-persistence', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const sz4p = require('../../runtime-z-operational-nervous-system/persistence/sz4PersistenceRuntime');
    const sz4flags = require('../../runtime-z-operational-nervous-system/config/sz4FeatureFlags');
    const schema = await sz4p.ensureSchema();
    res.json({
      ok: true,
      flags: {
        persistence: sz4flags.isPersistenceEnabled(),
        pilot_only: sz4flags.persistencePilotOnly(),
        ttl_days: sz4flags.persistenceTtlDays(),
        promoted_tenants: sz4flags.promotedTenants(),
        pilot_tenants: process.env.IMPETUS_SZ4_PERSISTENCE_PILOT_TENANTS || null,
      },
      schema,
      health: sz4p.getHealth(),
      diagnostics: sz4p.getDiagnostics(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/sz4-persistence/bootstrap-schema', async (req, res) => {
  try {
    const sz4p = require('../../runtime-z-operational-nervous-system/persistence/sz4PersistenceRuntime');
    const result = await sz4p.ensureSchema();
    res.json({ ok: result.ok, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/sz4-persistence/purge-expired', async (req, res) => {
  try {
    const sz4p = require('../../runtime-z-operational-nervous-system/persistence/sz4PersistenceRuntime');
    const result = await sz4p.purgeExpired();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── Enterprise Federation (PROMPT 16) ───────────────────────────────────────

router.get('/federation', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const gov = require('../../federation/governance/federationGovernanceService');
    const bootstrap = require('../../federation/bootstrap/federationSchemaBootstrap');
    const schema = await bootstrap.ensureFederationSchema();
    res.json({
      ok: true,
      diagnostics: gov.getDiagnostics(),
      schema,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/federation/providers', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'company_id required' });
    const configSvc = require('../../federation/services/federationConfigService');
    const gov = require('../../federation/governance/federationGovernanceService');
    const access = gov.assertTenantAccess(companyId, req.user?.company_id);
    if (!access.ok && req.user?.role !== 'admin' && !req.user?.is_tenant_admin) {
      return res.status(403).json({ ok: false, code: access.code });
    }
    const providers = await configSvc.listProviders(companyId);
    res.json({ ok: true, providers, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/federation/providers', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'company_id required' });
    const gov = require('../../federation/governance/federationGovernanceService');
    const access = gov.assertTenantAccess(companyId, req.user?.company_id);
    if (!access.ok && req.user?.role !== 'admin' && !req.user?.is_tenant_admin) {
      return res.status(403).json({ ok: false, code: access.code });
    }
    const configSvc = require('../../federation/services/federationConfigService');
    const row = await configSvc.upsertProvider(companyId, req.body || {});
    res.json({ ok: true, provider: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/federation/scim-token', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'company_id required' });
    const scim = require('../../federation/services/scimProvisioningService');
    const token = await scim.generateScimToken(companyId, req.body?.label);
    res.json({ ok: true, ...token, warning: 'Guarde o token — não será exibido novamente' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── Enterprise MFA (PROMPT 17) ──────────────────────────────────────────────

router.get('/mfa', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const gov = require('../../mfa/governance/mfaGovernanceService');
    const bootstrap = require('../../mfa/bootstrap/mfaSchemaBootstrap');
    const schema = await bootstrap.ensureMfaSchema();
    res.json({ ok: true, diagnostics: gov.getDiagnostics(), schema, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/mfa/policies', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = req.user?.company_id;
    const policySvc = require('../../mfa/services/mfaPolicyService');
    const policy = await policySvc.getPolicy(companyId);
    res.json({ ok: true, policy });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/mfa/policies', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const policySvc = require('../../mfa/services/mfaPolicyService');
    const policy = await policySvc.upsertPolicy(companyId, req.body || {});
    res.json({ ok: true, policy });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── MQTT Real (PROMPT 19) ───────────────────────────────────────────────────

router.get('/mqtt-real', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const gov = require('../../industrial-mqtt/governance/mqttGovernanceService');
    const runtime = require('../../industrial-mqtt/runtime/mqttRealClientRuntime');
    const brokerSvc = require('../../industrial-mqtt/services/mqttBrokerConfigService');
    await brokerSvc.ensureSchema();
    res.json({
      ok: true,
      diagnostics: gov.getDiagnostics(),
      stats: runtime.getGlobalStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/mqtt-real/brokers', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = req.user?.company_id;
    const brokerSvc = require('../../industrial-mqtt/services/mqttBrokerConfigService');
    const config = await brokerSvc.getBrokerConfig(companyId);
    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/mqtt-real/brokers', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const brokerSvc = require('../../industrial-mqtt/services/mqttBrokerConfigService');
    const config = await brokerSvc.upsertBrokerConfig(companyId, req.body || {});
    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/mqtt-real/reconnect', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const runtime = require('../../industrial-mqtt/runtime/mqttRealClientRuntime');
    const r = await runtime.reconnect(companyId);
    res.json(r);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/mqtt-real/audit', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Tenant obrigatório' });
    const db = require('../../db');
    const r = await db.query(
      `SELECT trace_id, event, outcome, broker_url, metadata, created_at
       FROM mqtt_connection_audit
       WHERE company_id = $1::uuid
       ORDER BY created_at DESC LIMIT $2`,
      [companyId, Math.min(100, parseInt(req.query.limit || '40', 10))]
    );
    res.json({ ok: true, events: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── Edge Runtime + Industrial Lab (PROMPT 22) ───────────────────────────────

router.get('/edge-runtime', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const gov = require('../../industrial-edge/governance/edgeGovernanceService');
    const runtime = require('../../industrial-edge/runtime/edgeRealSyncRuntime');
    const persistence = require('../../industrial-edge/services/edgeQueuePersistenceService');
    await persistence.ensureSchema();
    res.json({
      ok: true,
      diagnostics: gov.getDiagnostics(),
      stats: runtime.getGlobalStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/edge-runtime/queue', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = req.user?.company_id;
    const persistence = require('../../industrial-edge/services/edgeQueuePersistenceService');
    const mem = require('../../domains/environment/telemetry/environmentEdgeTelemetryRuntime');
    const dbStats = await persistence.getQueueStats(companyId);
    res.json({
      ok: true,
      memory: mem.getEdgeQueueSnapshot(companyId),
      persistent: dbStats,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/edge-runtime/sync', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const runtime = require('../../industrial-edge/runtime/edgeRealSyncRuntime');
    const ingest = require('../../domains/environment/telemetry/environmentTelemetryIngestService');
    const r = await runtime.syncAllLayers(companyId, req.user?.id, ingest.ingestSingle);
    res.json(r);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/industrial-lab/e2e', async (req, res) => {
  try {
    const lab = require('../../industrial-edge/lab/industrialLabE2eService');
    const companyId = req.body?.company_id || req.user?.company_id || lab.PILOT_DEFAULT;
    const r = await lab.runSuite(companyId);
    res.json(r);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/industrial-lab/runs', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const db = require('../../db');
    const r = await db.query(
      `SELECT run_id, suite, ok, checks, connectors, created_at
       FROM industrial_lab_runs ORDER BY created_at DESC LIMIT $1`,
      [Math.min(50, parseInt(req.query.limit || '20', 10))]
    );
    res.json({ ok: true, runs: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── Modbus Real (PROMPT 21) ─────────────────────────────────────────────────

router.get('/modbus-real', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const gov = require('../../industrial-modbus/governance/modbusGovernanceService');
    const runtime = require('../../industrial-modbus/runtime/modbusRealPollRuntime');
    const deviceSvc = require('../../industrial-modbus/services/modbusDeviceConfigService');
    await deviceSvc.ensureSchema();
    res.json({
      ok: true,
      diagnostics: gov.getDiagnostics(),
      stats: runtime.getGlobalStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/modbus-real/devices', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = req.user?.company_id;
    const deviceSvc = require('../../industrial-modbus/services/modbusDeviceConfigService');
    const config = await deviceSvc.getDeviceConfig(companyId);
    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/modbus-real/devices', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const deviceSvc = require('../../industrial-modbus/services/modbusDeviceConfigService');
    const config = await deviceSvc.upsertDeviceConfig(companyId, req.body || {});
    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/modbus-real/reconnect', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const runtime = require('../../industrial-modbus/runtime/modbusRealPollRuntime');
    const r = await runtime.reconnect(companyId);
    res.json(r);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/modbus-real/poll', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const runtime = require('../../industrial-modbus/runtime/modbusRealPollRuntime');
    const r = await runtime.executePoll(companyId, req.body?.registers || null, req.body?.meta || {});
    res.json(r);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/modbus-real/audit', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Tenant obrigatório' });
    const db = require('../../db');
    const r = await db.query(
      `SELECT trace_id, event, outcome, host, metadata, created_at
       FROM modbus_connection_audit
       WHERE company_id = $1::uuid
       ORDER BY created_at DESC LIMIT $2`,
      [companyId, Math.min(100, parseInt(req.query.limit || '40', 10))]
    );
    res.json({ ok: true, events: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── OPC-UA Real (PROMPT 20) ─────────────────────────────────────────────────

router.get('/opcua-real', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const gov = require('../../industrial-opcua/governance/opcuaGovernanceService');
    const runtime = require('../../industrial-opcua/runtime/opcuaRealClientRuntime');
    const serverSvc = require('../../industrial-opcua/services/opcuaServerConfigService');
    await serverSvc.ensureSchema();
    res.json({
      ok: true,
      diagnostics: gov.getDiagnostics(),
      stats: runtime.getGlobalStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/opcua-real/servers', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = req.user?.company_id;
    const serverSvc = require('../../industrial-opcua/services/opcuaServerConfigService');
    const config = await serverSvc.getServerConfig(companyId);
    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/opcua-real/servers', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const serverSvc = require('../../industrial-opcua/services/opcuaServerConfigService');
    const config = await serverSvc.upsertServerConfig(companyId, req.body || {});
    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/opcua-real/reconnect', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const runtime = require('../../industrial-opcua/runtime/opcuaRealClientRuntime');
    const r = await runtime.reconnect(companyId);
    res.json(r);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/opcua-real/audit', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Tenant obrigatório' });
    const db = require('../../db');
    const r = await db.query(
      `SELECT trace_id, event, outcome, endpoint_url, metadata, created_at
       FROM opcua_connection_audit
       WHERE company_id = $1::uuid
       ORDER BY created_at DESC LIMIT $2`,
      [companyId, Math.min(100, parseInt(req.query.limit || '40', 10))]
    );
    res.json({ ok: true, events: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─── Tenant RLS Hardening (PROMPT 18) ────────────────────────────────────────

router.get('/tenant-rls', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const gov = require('../../tenant-isolation/governance/tenantRlsGovernanceService');
    const rls = require('../../tenant-isolation/runtime/tenantRlsRuntime');
    const registry = await rls.listRegistry();
    res.json({
      ok: true,
      diagnostics: gov.getDiagnostics(),
      registry,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/tenant-rls/fuzz', async (req, res) => {
  try {
    const fuzz = require('../../tenant-isolation/testing/tenantFuzzSuite');
    const out = await fuzz.runFullSuite(req.body || {});
    res.json(out);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/tenant-rls/chaos', async (req, res) => {
  try {
    const attack = require('../../tenant-isolation/testing/crossTenantAttackSimulator');
    const out = await attack.runAttackSimulation(req.body || {});
    res.json(out);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/tenant-rls/activate', async (req, res) => {
  try {
    const rls = require('../../tenant-isolation/runtime/tenantRlsRuntime');
    const out = await rls.activateRlsPolicies('on');
    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/tenant-rls/deactivate', async (req, res) => {
  try {
    const rls = require('../../tenant-isolation/runtime/tenantRlsRuntime');
    const out = await rls.deactivateAllPolicies();
    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/mfa/audit-events', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = req.user?.company_id;
    const db = require('../../db');
    const r = await db.query(
      `SELECT trace_id, event, outcome, method, created_at
       FROM mfa_audit_events WHERE company_id = $1::uuid
       ORDER BY created_at DESC LIMIT $2`,
      [companyId, Math.min(100, parseInt(req.query.limit || '40', 10))]
    );
    res.json({ ok: true, events: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/federation/login-traces', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = req.user?.company_id;
    const db = require('../../db');
    const r = await db.query(
      `SELECT trace_id, protocol, event, outcome, created_at
       FROM federation_login_traces
       WHERE company_id = $1::uuid
       ORDER BY created_at DESC LIMIT $2`,
      [companyId, Math.min(100, parseInt(req.query.limit || '30', 10))]
    );
    res.json({ ok: true, traces: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

module.exports = router;
