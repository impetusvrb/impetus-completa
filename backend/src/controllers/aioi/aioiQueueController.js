'use strict';

/**
 * AIOI-ORG-5 — Queue API Controller (READ ONLY)
 */

const queueApiService = require('../../services/aioi/aioiQueueApiService');

function _resolveCompanyId(req) {
  return req.user?.company_id || null;
}

async function getQueue(req, res) {
  try {
    const companyId = _resolveCompanyId(req);
    const limit = req.query?.limit ? parseInt(String(req.query.limit), 10) : 20;

    const result = await queueApiService.getExecutiveQueue(companyId, { limit });

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

async function getQueueBundle(req, res) {
  try {
    const companyId = _resolveCompanyId(req);
    const limit = req.query?.limit ? parseInt(String(req.query.limit), 10) : 20;

    const result = await queueApiService.getExecutiveQueueBundle(companyId, { limit });

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
  getQueue,
  getQueueBundle
};
