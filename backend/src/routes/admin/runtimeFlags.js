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

    const { user_id, company_id } = req.body || {};
    if (!user_id || !company_id) {
      return res.status(400).json({ ok: false, error: 'user_id and company_id required in body' });
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

module.exports = router;
