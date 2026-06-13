'use strict';

/**
 * AIOI-P5.0 — Enterprise Executive Cockpit API Service (READ ONLY)
 *
 * Composição exclusiva P4.6 — getInterfaceIntelligenceReadModel uma única vez por request.
 */

const { isValidUUID } = require('../../utils/security');
const cockpitApiMetrics = require('./aioiCockpitApiMetrics');
const interfaceIntelligenceReadModel = require('./aioiInterfaceIntelligenceReadModelService');

function createRequestCache() {
  return { readModel: null, readModelPromise: null };
}

async function _loadReadModelOnce(companyId, cache) {
  if (cache.readModel) return cache.readModel;
  if (cache.readModelPromise) return cache.readModelPromise;

  cache.readModelPromise = (async () => {
    await cockpitApiMetrics.validateTenantRls(companyId);
    const res = await interfaceIntelligenceReadModel.getInterfaceIntelligenceReadModel(companyId);
    cache.readModel = res;
    return res;
  })();

  return cache.readModelPromise;
}

function _extractNested(readModelRes) {
  const iirm = readModelRes.interface_intelligence_read_model;
  const dvrm = iirm?.decision_visualization_read_model;
  const ecrm = dvrm?.executive_cockpit_read_model;
  const vrm = ecrm?.visualization_read_model;
  return { iirm, dvrm, ecrm, vrm };
}

function buildSummaryPayload(readModelRes) {
  const { ecrm } = _extractNested(readModelRes);
  return {
    executive_summary:  ecrm?.executive_summary || {},
    cockpit_readiness:  ecrm?.enterprise_cockpit_readiness || {}
  };
}

function buildOverviewPayload(readModelRes) {
  const { ecrm, vrm } = _extractNested(readModelRes);
  return {
    strategic_overview:       ecrm?.strategic_overview || {},
    visualization_readiness:  vrm?.enterprise_visualization_readiness || {}
  };
}

function buildInterfaceIntelligencePayload(readModelRes) {
  const { iirm } = _extractNested(readModelRes);
  return {
    interface_perspective:              iirm?.interface_perspective || {},
    interface_consistency:              iirm?.interface_consistency || {},
    interface_coverage:                 iirm?.interface_coverage || {},
    enterprise_interface_intelligence:  iirm?.enterprise_interface_intelligence || {}
  };
}

function buildDecisionVisualizationPayload(readModelRes) {
  const { dvrm } = _extractNested(readModelRes);
  return {
    decision_perspective:             dvrm?.decision_perspective || {},
    decision_consistency:             dvrm?.decision_consistency || {},
    decision_visualization_coverage:  dvrm?.decision_visualization_coverage || {},
    enterprise_decision_visualization: dvrm?.enterprise_decision_visualization || {}
  };
}

function buildReadModelPayload(readModelRes) {
  return readModelRes;
}

async function _handleEndpoint(companyId, cache, endpoint, builder, recordEndpointMetric) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  cockpitApiMetrics.recordCockpitApiRequested(companyId, endpoint);
  if (recordEndpointMetric) recordEndpointMetric(companyId);
  const startMs = Date.now();

  try {
    const readModelRes = await _loadReadModelOnce(companyId, cache);
    if (!readModelRes.ok) {
      cockpitApiMetrics.recordError(companyId, endpoint, readModelRes.error);
      return { ok: false, error: readModelRes.error };
    }

    const payload = builder(readModelRes);
    cockpitApiMetrics.recordCockpitApiCompleted(companyId, endpoint, Date.now() - startMs);
    return { ok: true, ...payload };
  } catch (err) {
    cockpitApiMetrics.recordError(companyId, endpoint, err.message);
    return { ok: false, error: err.message };
  }
}

async function getCockpitSummary(companyId, cache = createRequestCache()) {
  return _handleEndpoint(
    companyId,
    cache,
    'summary',
    buildSummaryPayload,
    cockpitApiMetrics.recordCockpitSummaryRequest
  );
}

async function getCockpitOverview(companyId, cache = createRequestCache()) {
  return _handleEndpoint(
    companyId,
    cache,
    'overview',
    buildOverviewPayload,
    cockpitApiMetrics.recordCockpitOverviewRequest
  );
}

async function getCockpitInterfaceIntelligence(companyId, cache = createRequestCache()) {
  return _handleEndpoint(
    companyId,
    cache,
    'interface-intelligence',
    buildInterfaceIntelligencePayload,
    cockpitApiMetrics.recordCockpitInterfaceRequest
  );
}

async function getCockpitDecisionVisualization(companyId, cache = createRequestCache()) {
  return _handleEndpoint(
    companyId,
    cache,
    'decision-visualization',
    buildDecisionVisualizationPayload,
    cockpitApiMetrics.recordCockpitVisualizationRequest
  );
}

async function getCockpitReadModel(companyId, cache = createRequestCache()) {
  return _handleEndpoint(
    companyId,
    cache,
    'read-model',
    buildReadModelPayload,
    null
  );
}

module.exports = {
  createRequestCache,
  buildSummaryPayload,
  buildOverviewPayload,
  buildInterfaceIntelligencePayload,
  buildDecisionVisualizationPayload,
  buildReadModelPayload,
  getCockpitSummary,
  getCockpitOverview,
  getCockpitInterfaceIntelligence,
  getCockpitDecisionVisualization,
  getCockpitReadModel
};
