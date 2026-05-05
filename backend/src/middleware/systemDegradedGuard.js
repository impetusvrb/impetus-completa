'use strict';

const { isDegraded } = require('../services/systemRuntimeState');

function _pathOnly(url) {
  return String(url || '').split('?')[0];
}

/**
 * Rotas que devem responder mesmo em DEGRADED (probes, auth, webhooks, sistema).
 * Inclui painéis GET-dominantes do app: bloquear isto deixava o dashboard em branco com
 * erro SYSTEM_DEGRADED enquanto rotas cognitivas pesadas (/api/cognitive-council, etc.)
 * continuam sujeitas ao guard — objectivo é cortar carga de escrita/IA, não leitura operacional.
 *
 * Nexus IA — custos, transparência e leitura da carteira: administrador deve poder diagnosticar
 * consumo em modo degradado; escrita na carteira (PATCH/checkout) permanece bloqueada para GET só.
 *
 * @param {string} path
 * @param {string} [method]
 */
function isExemptFromDegradedBlock(path, method) {
  const p = _pathOnly(path);
  const m = String(method || 'GET').toUpperCase();

  if (!p.startsWith('/api')) return true;
  if (p === '/api/health' || p === '/api/health/settings-module') return true;
  if (p.startsWith('/api/system/')) return true;
  if (p.startsWith('/api/auth')) return true;
  if (p === '/api/webhook' || p.startsWith('/api/webhooks/')) return true;
  if (p.startsWith('/api/dashboard')) return true;
  if (p.startsWith('/api/live-dashboard')) return true;
  if (p.startsWith('/api/factory-team')) return true;

  /* Leituras Nexus IA (custos/transparência; GET carteira — checkout/settings continuam POST/PATCH bloqueados) */
  if (p.startsWith('/api/admin/nexus-custos')) return true;
  if (p.startsWith('/api/nexus-ia')) return true;
  if (p.startsWith('/api/admin/nexus-wallet') && (m === 'GET' || m === 'HEAD')) return true;

  return false;
}

/**
 * Bloqueia tráfego /api (excepto lista branca) quando o processo está em DEGRADED.
 */
function systemDegradedGuard(req, res, next) {
  if (!isDegraded()) return next();
  const p = _pathOnly(req.originalUrl || req.url || '');
  if (isExemptFromDegradedBlock(p, req.method)) return next();
  res.setHeader('Cache-Control', 'no-store');
  return res.status(503).json({
    ok: false,
    error: 'SYSTEM_DEGRADED',
    message: 'Sistema temporariamente indisponível para garantir consistência.'
  });
}

module.exports = {
  systemDegradedGuard,
  isExemptFromDegradedBlock
};
