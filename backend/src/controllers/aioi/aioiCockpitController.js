'use strict';

/**
 * AIOI-P5.0 — Enterprise Executive Cockpit API Controller (READ ONLY)
 */

const cockpitApiService = require('../../services/aioi/aioiCockpitApiService');

function _resolveCompanyId(req) {
  return req.user?.company_id || null;
}

function _attachCache(req) {
  if (!req.aioiCockpitCache) {
    req.aioiCockpitCache = cockpitApiService.createRequestCache();
  }
  return req.aioiCockpitCache;
}

function _sendResult(res, result) {
  res.set('Cache-Control', 'no-store');
  if (!result.ok) {
    const status = result.error === 'companyId inválido' ? 400 : 500;
    return res.status(status).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true, ...result });
}

async function getSummary(req, res) {
  try {
    const companyId = _resolveCompanyId(req);
    const result = await cockpitApiService.getCockpitSummary(companyId, _attachCache(req));
    return _sendResult(res, result);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function getOverview(req, res) {
  try {
    const companyId = _resolveCompanyId(req);
    const result = await cockpitApiService.getCockpitOverview(companyId, _attachCache(req));
    return _sendResult(res, result);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function getInterfaceIntelligence(req, res) {
  try {
    const companyId = _resolveCompanyId(req);
    const result = await cockpitApiService.getCockpitInterfaceIntelligence(companyId, _attachCache(req));
    return _sendResult(res, result);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function getDecisionVisualization(req, res) {
  try {
    const companyId = _resolveCompanyId(req);
    const result = await cockpitApiService.getCockpitDecisionVisualization(companyId, _attachCache(req));
    return _sendResult(res, result);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function getReadModel(req, res) {
  try {
    const companyId = _resolveCompanyId(req);
    const result = await cockpitApiService.getCockpitReadModel(companyId, _attachCache(req));
    return _sendResult(res, result);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = {
  getSummary,
  getOverview,
  getInterfaceIntelligence,
  getDecisionVisualization,
  getReadModel
};
