/** OPM-008 — Mensagens cognitivas. */
const MESSAGES = Object.freeze({
  empty: 'Sem recomendações cognitivas para o snapshot actual.',
  partial: 'Dados parciais — alguns indicadores dependem de capacidade de armazém.',
  error: 'Erro ao carregar camada cognitiva.',
  timeout: 'Timeout na consolidação cognitiva.',
  permission_denied: 'Permissão insuficiente para Cognitive Logistics.',
  api_unavailable: 'APIs WMS-003 indisponíveis.'
});

export function toClOperationalMessage(key) {
  return MESSAGES[key] || MESSAGES.error;
}

export function sanitizeClDetail(detail) {
  if (!detail || typeof detail !== 'string') return null;
  if (detail.length > 200) return `${detail.slice(0, 200)}…`;
  return detail;
}
