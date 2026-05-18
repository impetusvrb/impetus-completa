const _buffer = [];
const MAX = 100;

export function recordEnvironmentPublicationAudit(entry) {
  _buffer.unshift({ ts: Date.now(), ...entry, domain: 'environment' });
  if (_buffer.length > MAX) _buffer.length = MAX;
}

export function getEnvironmentPublicationAuditTail(n = 20) {
  return _buffer.slice(0, n);
}
