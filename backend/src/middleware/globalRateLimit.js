/**
 * IMPETUS - Rate Limit Global
 * Proteção contra picos de requisições em rotas críticas
 * Usar após auth: req.user disponível para limite por usuário
 */
'use strict';

const rateLimit = require('express-rate-limit');

function skipWebhookAndPreflight(req) {
  if (req.method === 'OPTIONS') return true;
  const p = String(req.originalUrl || req.url || '').split('?')[0];
  if (p === '/api/webhook' || p.startsWith('/api/webhooks/')) return true;
  return false;
}

/** 60 req/min por IP em rotas de API (quando usuário não autenticado) */
const apiByIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_API_PER_MIN, 10) || 120,
  message: { ok: false, error: 'Muitas requisições. Aguarde um momento.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => skipWebhookAndPreflight(req) || !!req.user?.id
});

/** 300 req/min por usuário autenticado em rotas críticas (dashboard, comunicações, etc.) */
const apiByUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_USER_PER_MIN, 10) || 300,
  message: { ok: false, error: 'Limite de requisições atingido. Aguarde um momento.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ? `u:${req.user.id}` : req.ip
});

/** 30 req/min para rotas pesadas (smart-summary, executive, etc.) */
const heavyRouteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_HEAVY_PER_MIN, 10) || 30,
  message: { ok: false, error: 'Limite de processamento atingido. Tente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ? `u:${req.user.id}` : req.ip
});

module.exports = {
  apiByIpLimiter,
  apiByUserLimiter,
  heavyRouteLimiter
};
