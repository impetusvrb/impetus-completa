'use strict';

/**
 * AIOI-P5.4 — Executive Cockpit View Model Transport (READ ONLY · composição P5.3)
 *
 * Transporte HTTP mínimo para getExecutiveViewModelBundle — sem lógica de negócio.
 */

const viewModelService = require('../../services/aioi/aioiExecutiveViewModelService');

function _resolveCompanyId(req) {
  return req.user?.company_id || null;
}

function _attachCache(req) {
  if (!req.aioiExecutiveViewModelCache) {
    req.aioiExecutiveViewModelCache = viewModelService.createViewModelCache();
  }
  return req.aioiExecutiveViewModelCache;
}

async function getViewModelBundle(req, res) {
  try {
    const companyId = _resolveCompanyId(req);
    const result = await viewModelService.getExecutiveViewModelBundle(companyId, _attachCache(req));
    res.set('Cache-Control', 'no-store');
    if (!result.ok) {
      const status = result.error === 'companyId inválido' ? 400 : 500;
      return res.status(status).json({ ok: false, error: result.error });
    }
    return res.json(result);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = {
  getViewModelBundle
};
