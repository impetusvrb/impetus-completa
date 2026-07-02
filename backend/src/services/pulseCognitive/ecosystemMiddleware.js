/**
 * CERT-PULSE-03 FASE 1 — Middleware HTTP bridge (rotas WRITE → Pulse Cognitivo).
 * Aditivo, assíncrono, nunca bloqueia resposta.
 */
'use strict';

const { ecosystemHooks, fromUser } = require('./ecosystemHooks');

const ROUTE_MAP = [
  { test: (p, m) => m === 'POST' && /\/tpm/i.test(p), type: 'tpm_recorded' },
  { test: (p, m) => m === 'POST' && /\/proposals/i.test(p), type: 'proacao_submitted' },
  { test: (p, m) => m === 'POST' && /intelligent-registration/i.test(p), type: 'intelligent_registration' },
  { test: (p, m) => m === 'POST' && /\/communications/i.test(p), type: 'communication' },
  { test: (p, m) => /\/safety/i.test(p) && ['POST', 'PUT', 'PATCH'].includes(m), type: 'sst_incident' },
  { test: (p, m) => /\/quality/i.test(p) && ['POST', 'PUT', 'PATCH'].includes(m), type: 'quality_event' },
  { test: (p, m) => /manutencao-ia/i.test(p) && ['POST', 'PUT', 'PATCH'].includes(m), type: 'os_completed' },
  { test: (p, m) => /biblioteca|technical-library|equipment-library/i.test(p) && m === 'POST', type: 'training_completed' },
  { test: (p, m) => /logistics/i.test(p) && ['POST', 'PUT'].includes(m), type: 'procedure_compliance' },
  { test: (p, m) => /warehouse|almoxarifado/i.test(p) && ['POST', 'PUT'].includes(m), type: 'procedure_compliance' },
  { test: (p, m) => /raw-material|operational-anomalies/i.test(p) && m === 'POST', type: 'quality_event' }
];

function pulseCognitiveEcosystemMiddleware(req, res, next) {
  if (process.env.IMPETUS_PULSE_COGNITIVE === 'off') return next();

  const path = req.originalUrl || req.path || '';
  const method = (req.method || 'GET').toUpperCase();
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (!isWrite || !path.startsWith('/api')) return next();

  const originalEnd = res.end;
  res.end = function wrappedEnd(...args) {
    res.end = originalEnd;
    const status = res.statusCode;
    if (status >= 200 && status < 300 && req.user?.company_id) {
      setImmediate(() => {
        try {
          const match = ROUTE_MAP.find((r) => r.test(path, method));
          if (!match) return;
          const u = fromUser(req);
          ecosystemHooks.safe('http_middleware', req.user.company_id, {
            ...u,
            event_type: match.type,
            event_source: 'http_bridge',
            payload: { path, method }
          });
        } catch (_) {}
      });
    }
    return originalEnd.apply(this, args);
  };

  return next();
}

module.exports = { pulseCognitiveEcosystemMiddleware, ROUTE_MAP };
