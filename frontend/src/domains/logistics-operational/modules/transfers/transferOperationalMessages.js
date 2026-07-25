/** OPM-006 — Mensagens operacionais técnicas. */
const MESSAGES = Object.freeze({
  empty: 'Nenhuma transferência interna registada · WMS-003',
  partial: 'KPIs parciais · dados incompletos',
  error: 'Erro ao carregar transferências',
  timeout: 'Timeout WMS-003 · retry disponível',
  permission_denied: 'Permissão transfer.execute necessária',
  api_unavailable: 'API WMS-003 indisponível',
  integration_unavailable: 'Integração inventário indisponível'
});

export function toTransferOperationalMessage(key) {
  return MESSAGES[key] || MESSAGES.error;
}

export function sanitizeOperationalDetail(detail) {
  if (!detail || typeof detail !== 'string') return null;
  if (detail.length > 120) return `${detail.slice(0, 117)}…`;
  return detail;
}
