export const SHIPPING_OPERATIONAL_MESSAGES = Object.freeze({
  empty: 'Nenhuma ordem de expedição registada. Ordens outbound aparecerão aqui após carga WMS-003.',
  partial: 'Dados parciais — algumas ordens podem estar incompletas.',
  error: 'Erro ao carregar ordens de expedição.',
  timeout: 'Tempo de resposta excedido ao contactar WMS-003.',
  permission_denied: 'Sem permissão para aceder ao módulo Expedição.',
  integration_unavailable: 'API WMS-003 indisponível.',
  api_unavailable: 'Serviço logístico indisponível.'
});

export function toShippingOperationalMessage(key) {
  return SHIPPING_OPERATIONAL_MESSAGES[key] || SHIPPING_OPERATIONAL_MESSAGES.error;
}

export function sanitizeOperationalDetail(msg) {
  if (!msg || typeof msg !== 'string') return null;
  if (msg.length > 180) return `${msg.slice(0, 177)}…`;
  return msg;
}
