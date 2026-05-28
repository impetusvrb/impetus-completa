'use strict';

/**
 * PROMPT 26 — Cognitive Registry Consolidation API
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireHierarchy } = require('../middleware/auth');
const flags = require('../cognitiveRegistry/consolidation/cognitiveRegistryConsolidationFlags');
const unified = require('../cognitiveRegistry/consolidation/unifiedCognitiveRegistry');
const sourceCatalog = require('../cognitiveRegistry/consolidation/registrySourceCatalog');
const audit = require('../cognitiveRegistry/consolidation/cognitiveRegistryAuditService');

function _companyId(req) {
  return req.user?.company_id || null;
}

async function _auditIfNeeded(req, eventType, payload) {
  if (flags.isShadowMode() || !flags.shouldPersistAuditTrail()) return;
  await audit.recordAudit({
    companyId: _companyId(req),
    eventType,
    actorUserId: req.user?.id,
    payload
  });
}

router.get('/health', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const companyId = _companyId(req);
  const health = unified.getHealth();
  await _auditIfNeeded(req, 'health_read', { divergence_total: health?.snapshot?.divergence?.total });
  res.json({
    ok: true,
    health,
    tenant: {
      company_id: companyId,
      pilot: flags.isPilotTenant(companyId),
      consolidation_active: flags.isConsolidationActive(),
      mode: flags.consolidationMode(),
      audit_persist: flags.shouldPersistAuditTrail()
    }
  });
});

router.get('/snapshot', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const snap = unified.buildSnapshot(req.query.refresh === 'true');
    await _auditIfNeeded(req, 'snapshot_read', {
      counts: snap.counts,
      divergence_total: snap.divergence.count
    });
    res.json({ ok: true, snapshot: snap, audit_persist: flags.shouldPersistAuditTrail() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/sources', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    delivery_authority: sourceCatalog.DELIVERY_AUTHORITY,
    sources: sourceCatalog.listSources()
  });
});

router.get('/divergence', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const report = unified.detectDivergences();
    await _auditIfNeeded(req, 'divergence_read', { count: report.count, high: report.high });
    res.json({ ok: true, ...report });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/blocks/:blockId', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const resolved = unified.resolveBlock(req.params.blockId, {
      profileTier: req.query.profile_tier
    });
    if (!resolved.ok) return res.status(404).json(resolved);
    await _auditIfNeeded(req, 'block_resolve', { block_id: req.params.blockId });
    res.json({ ok: true, ...resolved });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/domains/:domainKey', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const resolved = unified.resolveDomain(req.params.domainKey);
    res.status(resolved.ok ? 200 : 404).json({ ok: resolved.ok, ...resolved });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/domains/:domainKey/blocks', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const blocks = unified.listBlocksByDomain(req.params.domainKey);
    res.json({ ok: true, domain: req.params.domainKey, blocks, count: blocks.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/cache/invalidate', requireAuth, requireHierarchy(2), (req, res) => {
  unified.invalidateCache();
  res.json({ ok: true, invalidated: true });
});

module.exports = router;
