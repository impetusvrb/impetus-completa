/**
 * IMPETUS - Logger Estruturado
 * Em produção com LOG_FORMAT=json: saída JSON para ferramentas de log
 * Caso contrário: formato legível para desenvolvimento
 */
const useJson = process.env.LOG_FORMAT === 'json';

function formatLevel(level) {
  return level.toUpperCase();
}

function buildPayload(level, message, meta = {}) {
  const base = {
    timestamp: new Date().toISOString(),
    level: formatLevel(level),
    message: String(message),
    ...meta
  };
  if (useJson) {
    return JSON.stringify(base);
  }
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${base.timestamp}] [${base.level}] ${message}${metaStr}`;
}

const logger = {
  info(message, meta = {}) {
    console.log(buildPayload('info', message, meta));
  },
  warn(message, meta = {}) {
    console.warn(buildPayload('warn', message, meta));
  },
  error(message, meta = {}) {
    console.error(buildPayload('error', message, meta));
  },
  debug(message, meta = {}) {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG) {
      console.debug(buildPayload('debug', message, meta));
    }
  }
};

module.exports = logger;
