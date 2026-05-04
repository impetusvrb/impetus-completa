'use strict';

/**
 * Classifica pedidos HTTP para política adaptativa (CRITICAL / NORMAL / HEAVY).
 * CRITICAL: sempre permitido mesmo em LIMITED (probes, auth, sistema).
 */

function pathOnly(url) {
  return String(url || '').split('?')[0];
}

/**
 * @param {string} method
 * @param {string} url
 * @returns {'CRITICAL'|'NORMAL'|'HEAVY'}
 */
function classifyHttpRequest(method, url) {
  const p = pathOnly(url);
  const m = String(method || 'GET').toUpperCase();

  if (!p.startsWith('/api')) return 'NORMAL';

  if (
    p === '/api/health' ||
    p === '/api/health/settings-module' ||
    p.startsWith('/api/system/')
  ) {
    return 'CRITICAL';
  }
  if (p.startsWith('/api/auth')) return 'CRITICAL';
  if (p === '/api/webhook' || p.startsWith('/api/webhooks/')) return 'CRITICAL';

  if (p.startsWith('/api/cognitive-council')) return 'HEAVY';
  if (p.startsWith('/api/cadastrar-com-ia')) return 'HEAVY';
  if (p.startsWith('/api/intelligent-registration')) return 'HEAVY';
  if (p.startsWith('/api/manutencao-ia')) return 'HEAVY';
  if (p.startsWith('/api/vision')) return 'HEAVY';
  if (p.startsWith('/api/asset-management')) return 'HEAVY';
  if (p.startsWith('/api/technical-library')) return 'HEAVY';
  if (p.includes('/dashboard/chat-multimodal')) return 'HEAVY';

  if (p.startsWith('/api/dashboard')) {
    if (m === 'POST' || p.includes('/cognitive') || p.includes('/council') || p.includes('multimodal')) {
      return 'HEAVY';
    }
  }

  return 'NORMAL';
}

function estimatePayloadCost(req) {
  let w = 0;
  try {
    const raw = JSON.stringify(req.body ?? {});
    w += Math.min(55, Math.floor(raw.length / 1800));
    const b = req.body;
    if (b && typeof b === 'object') {
      if (Array.isArray(b.images)) w += Math.min(40, b.images.length * 20);
      if (b.input && Array.isArray(b.input.images)) w += Math.min(40, b.input.images.length * 20);
      if (b.data && Array.isArray(b.data.images)) w += Math.min(40, b.data.images.length * 20);
      const t = (b.input && b.input.text) || b.requestText || b.message || '';
      if (typeof t === 'string') w += Math.min(35, Math.floor(t.length / 900));
      const opt = b.options && typeof b.options === 'object' ? b.options : {};
      if (opt.cognitive_fanout || opt.parallel_models || opt.deep_reasoning) w += 40;
    }
  } catch (_e) {
    /* ignore */
  }
  return Math.min(100, w);
}

/**
 * Depois do body-parser: ajusta HEAVY/NORMAL por custo estimado (payload, multimodal, fan-out).
 */
function requestCapacityRefineMiddleware(req, res, next) {
  let cls = req.impetusRequestClass || 'NORMAL';
  let cost = estimatePayloadCost(req);
  try {
    const loadShape = require('../services/resilienceLoadShape');
    const feedback = require('../services/resilienceFeedbackLoop');
    const predictive = loadShape.getPredictiveCostBoost();
    const mult = feedback.getConservatismMultiplier();
    cost = Math.min(100, Math.round(cost * mult + predictive));
  } catch (_e) {
    /* ignore */
  }
  req.impetusRequestCostScore = cost;

  if (cls === 'NORMAL' && cost >= 52) cls = 'HEAVY';
  if (cls === 'HEAVY' && cost <= 18 && req.method === 'GET') cls = 'NORMAL';

  req.impetusRequestClass = cls;
  next();
}

function requestCapacityClassifyMiddleware(req, res, next) {
  req.impetusRequestClass = classifyHttpRequest(req.method, req.originalUrl || req.url || '');
  next();
}

module.exports = {
  classifyHttpRequest,
  estimatePayloadCost,
  requestCapacityClassifyMiddleware,
  requestCapacityRefineMiddleware
};
