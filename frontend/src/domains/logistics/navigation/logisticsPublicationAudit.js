const _buffer = [];
const MAX = 100;

export function recordLogisticsPublicationAudit(entry) {
  _buffer.unshift({ ts: Date.now(), ...entry, domain: 'logistics' });
  if (_buffer.length > MAX) _buffer.length = MAX;
}

export function getLogisticsPublicationAuditTail(n = 20) {
  return _buffer.slice(0, n);
}
