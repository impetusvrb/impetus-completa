'use strict';

/**
 * GF-024 — Semantic Signal Loader (Read-Only).
 * Fontes autorizadas: semantic_signals · domain_events (ctx) · supplyCoreSemantics SSOT.
 */

const { SUPPLY_RUNTIME_IDENTITY } = require('../core/supplyRuntimeIdentity');
const { normalizeSemanticSignals, normalizeDomainEvents } = require('./supplySemanticSignalNormalizer');
const { logSupplySignalLoaderEvent } = require('./supplySignalLoaderLogger');

async function loadSupplyTenantSignals(user = {}, ctx = {}) {
  const t0 = Date.now();
  const companyId = user?.company_id || ctx.tenant_id;
  const runtimeId = SUPPLY_RUNTIME_IDENTITY.runtime_id;

  if (ctx.mock_signals) {
    return { ...ctx.mock_signals, mock_signals: true };
  }

  if (!companyId) {
    logSupplySignalLoaderEvent('LOAD_SKIP', { runtime: runtimeId, reason: 'missing_company_id' });
    return {
      ok: false,
      inactive: true,
      read_only: true,
      reason: 'missing_company_id',
      signal_readiness: 'NO_DATASET',
      semantic_bundle: null,
      domain_events: [],
      mock_signals: false
    };
  }

  try {
    logSupplySignalLoaderEvent('LOAD_START', { runtime: runtimeId, entity: 'tenant', origin: ctx.origin || 'semantic' });

    const rawSemantic = ctx.semantic_signals || null;
    const rawEvents = ctx.domain_events || [];

    if (!rawSemantic || typeof rawSemantic !== 'object') {
      logSupplySignalLoaderEvent('LOAD_COMPLETE', {
        runtime: runtimeId,
        signal_readiness: 'NO_DATASET',
        duration_ms: Date.now() - t0,
        origin: 'none'
      });
      return {
        ok: true,
        inactive: true,
        read_only: true,
        company_id: companyId,
        loaded_at: new Date().toISOString(),
        signal_readiness: 'NO_DATASET',
        signal_degradation: 'no_semantic_signals',
        semantic_bundle: null,
        domain_events: [],
        data_sources: ['semantic_in_memory_only'],
        mock_signals: false
      };
    }

    const semantic_bundle = normalizeSemanticSignals(rawSemantic);
    const domain_events = normalizeDomainEvents(rawEvents);
    const hasEntities = semantic_bundle.entity_signal_total > 0;
    const hasEvents = domain_events.length > 0;
    const signal_readiness = hasEntities || hasEvents ? (hasEntities ? 'ready' : 'partial') : 'NO_DATASET';

    logSupplySignalLoaderEvent('LOAD_COMPLETE', {
      runtime: runtimeId,
      signal_readiness,
      entity: 'semantic_bundle',
      binding: semantic_bundle.entity_signal_total,
      duration_ms: Date.now() - t0,
      origin: ctx.origin || 'semantic'
    });

    return {
      ok: true,
      inactive: true,
      read_only: true,
      company_id: companyId,
      loaded_at: new Date().toISOString(),
      signal_readiness,
      signal_degradation: signal_readiness === 'NO_DATASET' ? 'empty_semantic_signals' : 'none',
      semantic_bundle,
      domain_events,
      data_sources: ['supplyCoreSemantics', 'canonicalContracts', 'supplyEventCatalog'],
      ssot: semantic_bundle.ssot,
      mock_signals: false,
      event_publication: false
    };
  } catch (err) {
    logSupplySignalLoaderEvent('LOAD_ERROR', {
      runtime: runtimeId,
      duration_ms: Date.now() - t0,
      error: err.message
    });
    return {
      ok: false,
      inactive: true,
      read_only: true,
      reason: 'semantic_normalize_error',
      error_message: err.message,
      signal_readiness: 'NO_DATASET',
      semantic_bundle: null,
      domain_events: [],
      mock_signals: false
    };
  }
}

module.exports = { loadSupplyTenantSignals };
