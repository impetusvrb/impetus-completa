/**
 * Respostas de erro HTTP seguras: em produção não expõe err.message ao cliente.
 */
'use strict';

const crypto = require('crypto');

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * @param {import('express').Response} res
 * @param {Error} err
 * @param {object} [opts]
 * @param {number} [opts.status]
 * @param {string} [opts.code]
 * @param {object} [opts.logContext]
 */
function sendSafeError(res, err, opts = {}) {
  const s = Number(opts.status);
  const status = Number.isFinite(s) && s >= 400 && s < 600 ? s : 500;
  const code = opts.code || 'INTERNAL_ERROR';
  const correlationId = opts.correlationId || crypto.randomUUID();

  const logLine = {
    correlationId,
    code,
    status,
    message: err && err.message,
    stack: err && err.stack,
    ...opts.logContext
  };
  console.error('[SafeError]', JSON.stringify(logLine));

  if (isProduction()) {
    return res.status(status).json({
      ok: false,
      error: 'Ocorreu um erro interno. Tente novamente mais tarde.',
      code,
      correlationId
    });
  }

  return res.status(status).json({
    ok: false,
    error: (err && err.message) || 'Erro interno',
    code,
    correlationId
  });
}

module.exports = {
  sendSafeError,
  isProduction
};
