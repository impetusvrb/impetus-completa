/**
 * IMPETUS - Rate Limit App Impetus Outbox
 * Evita polling agressivo: máx 2 req/s por empresa
 */
'use strict';

const rateLimit = require('express-rate-limit');

const appImpetusLimiter = rateLimit({
  windowMs: 1000,
  max: parseInt(process.env.RATE_LIMIT_APP_IMPETUS_PER_SEC, 10) || 2,
  message: { ok: false, error: 'Polling muito frequente. Aguarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.company_id ? `c:${req.user.company_id}` : req.ip
});

module.exports = { appImpetusLimiter };
