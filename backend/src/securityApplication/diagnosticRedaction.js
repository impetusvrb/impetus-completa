'use strict';

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN =
  /(?:^|_)(?:SECRET|TOKEN|PASSWORD|PASS|API_KEY|PRIVATE_KEY|ENCRYPTION_KEY|ENC_KEY|CREDENTIAL|AUTHORIZATION|COOKIE|SESSION|DATABASE_URL)(?:_|$)/i;

function isSensitiveDiagnosticKey(key) {
  return SENSITIVE_KEY_PATTERN.test(String(key || ''));
}

function sanitizeDiagnosticPayload(value, seen = new WeakSet()) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDiagnosticPayload(item, seen));
  }
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return REDACTED;
  seen.add(value);

  const sanitized = {};
  for (const [key, child] of Object.entries(value)) {
    sanitized[key] = isSensitiveDiagnosticKey(key)
      ? REDACTED
      : sanitizeDiagnosticPayload(child, seen);
  }
  seen.delete(value);
  return sanitized;
}

function sanitizePm2ProcessList(rawList) {
  let list = rawList;
  if (typeof rawList === 'string') {
    try {
      list = JSON.parse(rawList);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];

  return list.map((processInfo) => ({
    name: processInfo?.name || null,
    pid: Number.isInteger(processInfo?.pid) ? processInfo.pid : null,
    status: processInfo?.pm2_env?.status || null,
    restart_time: Number.isInteger(processInfo?.pm2_env?.restart_time)
      ? processInfo.pm2_env.restart_time
      : null,
    pm_uptime: processInfo?.pm2_env?.pm_uptime || null,
    pm_exec_path: processInfo?.pm2_env?.pm_exec_path || null,
    pm_cwd: processInfo?.pm2_env?.pm_cwd || null,
    cpu: typeof processInfo?.monit?.cpu === 'number' ? processInfo.monit.cpu : null,
    memory: typeof processInfo?.monit?.memory === 'number' ? processInfo.monit.memory : null
  }));
}

module.exports = {
  REDACTED,
  SENSITIVE_KEY_PATTERN,
  isSensitiveDiagnosticKey,
  sanitizeDiagnosticPayload,
  sanitizePm2ProcessList
};
