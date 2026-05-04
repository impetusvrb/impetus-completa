'use strict';

/**
 * Chaos controlado em runtime (IMPETUS_CHAOS_ENABLED=true).
 * — Middleware HTTP: latência, 500, 504, corpo vazio, flip intermitente (rotas não críticas).
 * — maybeRejectProvider(provider): falhas simuladas nas chamadas SDK (GPT / Claude / Gemini).
 * Não activar em produção sem consciência da equipa.
 */

function _enabled() {
  return String(process.env.IMPETUS_CHAOS_ENABLED || '').toLowerCase() === 'true';
}

function _criticalPath(req) {
  const p = String(req.originalUrl || req.url || '').split('?')[0];
  return (
    !p.startsWith('/api') ||
    p.startsWith('/api/system/') ||
    p.startsWith('/api/auth')
  );
}

/**
 * Quando false: falhas injectadas por chaos **não** contam para o circuit breaker (testes sem poluir métricas).
 * Omisso ou true: comportamento anterior — chaos incrementa falhas do CB.
 */
function shouldAffectCircuitBreaker() {
  const v = String(process.env.IMPETUS_CHAOS_AFFECTS_CB || 'true').trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

function _providerRate(provider) {
  const key = String(provider || '').toLowerCase();
  const envMap = {
    gpt: process.env.IMPETUS_CHAOS_GPT_RATE,
    openai: process.env.IMPETUS_CHAOS_GPT_RATE,
    claude: process.env.IMPETUS_CHAOS_CLAUDE_RATE,
    gemini: process.env.IMPETUS_CHAOS_GEMINI_RATE
  };
  const raw =
    envMap[key] !== undefined && envMap[key] !== ''
      ? envMap[key]
      : process.env.IMPETUS_CHAOS_PROVIDER_RATE;
  const v = parseFloat(raw || '0', 10);
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

/**
 * Injecção falhada antes da chamada real ao provider (SDK).
 * Ordem: executar antes de circuitBreaker.beginCall.
 */
async function maybeRejectProvider(provider) {
  if (!_enabled()) return;
  if (String(process.env.IMPETUS_CHAOS_SUPPRESS_PROVIDER || '').toLowerCase() === 'true') {
    return;
  }

  const filter = String(process.env.IMPETUS_CHAOS_TARGET_PROVIDER || 'all')
    .toLowerCase()
    .trim();
  const pk = String(provider || '').toLowerCase();
  if (filter !== 'all' && filter !== pk) {
    return;
  }

  const rate = _providerRate(provider);
  const flip = String(process.env.IMPETUS_CHAOS_FLIP_MODE || '').toLowerCase() === 'true';
  if (flip) {
    const k = `_flip_${pk}`;
    module.exports[k] = (module.exports[k] || 0) + 1;
    if (module.exports[k] % 2 === 0) {
      throw new Error('CHAOS_PROVIDER_FLIP');
    }
  }

  if (rate <= 0) return;
  if (Math.random() >= rate) return;

  const roll = Math.random();
  if (roll < 0.34) throw new Error('CHAOS_PROVIDER_TIMEOUT');
  if (roll < 0.67) throw new Error('CHAOS_PROVIDER_500');
  throw new Error('CHAOS_PROVIDER_EMPTY');
}

function chaosRuntimeMiddleware(req, res, next) {
  if (!_enabled()) {
    return next();
  }
  if (_criticalPath(req)) {
    return next();
  }

  const flip = String(process.env.IMPETUS_CHAOS_FLIP_MODE || '').toLowerCase() === 'true';
  if (flip) {
    module.exports._httpFlipCounter = (module.exports._httpFlipCounter || 0) + 1;
    if (module.exports._httpFlipCounter % 2 === 0) {
      return res.status(500).json({ error: 'CHAOS_HTTP_FLIP', chaos: true });
    }
  }

  const errRate = parseFloat(process.env.IMPETUS_CHAOS_ERROR_RATE || '0', 10) || 0;
  if (errRate > 0 && Math.random() < Math.min(1, errRate)) {
    return res.status(500).json({ error: 'CHAOS_HTTP_500', chaos: true });
  }

  const timeoutRate = parseFloat(process.env.IMPETUS_CHAOS_TIMEOUT_RATE || '0', 10) || 0;
  if (timeoutRate > 0 && Math.random() < Math.min(1, timeoutRate)) {
    return res.status(504).json({ error: 'CHAOS_GATEWAY_TIMEOUT', chaos: true });
  }

  const emptyRate = parseFloat(process.env.IMPETUS_CHAOS_EMPTY_RATE || '0', 10) || 0;
  if (emptyRate > 0 && Math.random() < Math.min(1, emptyRate)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send('');
  }

  const delay = parseInt(process.env.IMPETUS_CHAOS_LATENCY_INJECT_MS || '0', 10);
  if (delay > 0) {
    const capped = Math.min(Math.max(0, delay), 12000);
    if (capped > 0) {
      return setTimeout(() => next(), capped);
    }
  }
  return next();
}

function getChaosStatus() {
  return {
    enabled: _enabled(),
    chaos_affects_circuit_breaker: shouldAffectCircuitBreaker(),
    suppress_provider_injection: String(process.env.IMPETUS_CHAOS_SUPPRESS_PROVIDER || '').toLowerCase() === 'true',
    target_provider_filter: String(process.env.IMPETUS_CHAOS_TARGET_PROVIDER || 'all'),
    latency_inject_ms: parseInt(process.env.IMPETUS_CHAOS_LATENCY_INJECT_MS || '0', 10) || 0,
    http_error_rate: parseFloat(process.env.IMPETUS_CHAOS_ERROR_RATE || '0', 10) || 0,
    timeout_rate: parseFloat(process.env.IMPETUS_CHAOS_TIMEOUT_RATE || '0', 10) || 0,
    empty_response_rate: parseFloat(process.env.IMPETUS_CHAOS_EMPTY_RATE || '0', 10) || 0,
    flip_mode: String(process.env.IMPETUS_CHAOS_FLIP_MODE || '').toLowerCase() === 'true',
    provider_rates: {
      gpt: _providerRate('gpt'),
      claude: _providerRate('claude'),
      gemini: _providerRate('gemini')
    },
    critical_routes_excluded: true
  };
}

module.exports = {
  chaosRuntimeMiddleware,
  maybeRejectProvider,
  shouldAffectCircuitBreaker,
  getChaosStatus
};
