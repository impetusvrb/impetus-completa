'use strict';

/**
 * Structured Logger — JSON logging para produção.
 * 
 * Em produção emite JSON (fácil para Datadog, ELK, Loki).
 * Em dev mantém formato legível (console padrão).
 *
 * Uso:
 *   const log = require('./utils/structuredLogger');
 *   log.info('boot_complete', { port: 4000, host: '127.0.0.1' });
 *   log.warn('rls_skip', { table: 'users', reason: 'pilot_only' });
 *   log.error('db_connection_failed', { host: 'localhost', error: err.message });
 */

const isProd = () => String(process.env.NODE_ENV || '').toLowerCase() === 'production';

function _emit(level, event, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    service: 'impetus-backend',
    pid: process.pid,
    ...meta,
  };

  if (meta.error instanceof Error) {
    entry.error = meta.error.message;
    entry.stack = meta.error.stack;
  }

  if (isProd()) {
    const line = JSON.stringify(entry);
    if (level === 'error') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  } else {
    const fn = level === 'error' ? console.error
      : level === 'warn' ? console.warn
      : console.log;
    fn(`[${level.toUpperCase()}] ${event}`, meta);
  }
}

module.exports = {
  info: (event, meta) => _emit('info', event, meta),
  warn: (event, meta) => _emit('warn', event, meta),
  error: (event, meta) => _emit('error', event, meta),
  debug: (event, meta) => {
    if (process.env.LOG_LEVEL === 'debug') _emit('debug', event, meta);
  },
  audit: (event, meta) => _emit('audit', event, { ...meta, _audit: true }),
};
