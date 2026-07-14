'use strict';

/**
 * Caminho canónico do access log Nginx IMPETUS.
 * Produção activa: /var/log/nginx/impetus-access.log (impetus-production.conf).
 */
const CANONICAL_NGINX_ACCESS_LOG = '/var/log/nginx/impetus-access.log';

function getNginxAccessLogPath() {
  const raw = process.env.IMPETUS_NGINX_ACCESS;
  if (raw && String(raw).trim()) return String(raw).trim();
  return CANONICAL_NGINX_ACCESS_LOG;
}

module.exports = {
  CANONICAL_NGINX_ACCESS_LOG,
  getNginxAccessLogPath
};
