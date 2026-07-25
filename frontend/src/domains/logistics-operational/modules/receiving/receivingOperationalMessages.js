const MESSAGES = Object.freeze({
  empty: 'Nenhum recebimento registado. ASN e ordens aparecerão aqui após carga WMS-003.',
  partial: 'Dados parciais — algumas docas ou movimentos indisponíveis.',
  error: 'Erro ao carregar recebimentos.',
  timeout: 'Tempo esgotado na carga WMS-003.',
  permission_denied: 'Sem permissão para operações de recebimento.',
  integration_unavailable: 'API WMS-003 indisponível.'
});

export function toReceivingOperationalMessage(key) {
  return MESSAGES[key] || MESSAGES.error;
}

export function sanitizeOperationalDetail(detail) {
  if (!detail || typeof detail !== 'string') return null;
  if (detail.length > 200) return detail.slice(0, 200) + '…';
  return detail;
}

export function unavailableLabel() {
  return '—';
}
