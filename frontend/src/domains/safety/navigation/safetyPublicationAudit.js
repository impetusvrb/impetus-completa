const _buf = [];
const MAX = 100;

export function recordSafetyPublicationAudit(entry) {
  _buf.unshift({ ts: Date.now(), domain: 'safety', ...entry });
  if (_buf.length > MAX) _buf.length = MAX;
}

export function listRecentSafetyPublicationAudit(n = 20) {
  return _buf.slice(0, n);
}
