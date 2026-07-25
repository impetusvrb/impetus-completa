/** OPM-007 — Mensagens analíticas. */
export function toWiOperationalMessage(key) {
  const M = {
    empty: 'Sem dados consolidados · aguardar operações WMS-003',
    partial: 'Analytics parciais · algumas APIs indisponíveis',
    error: 'Erro ao consolidar inteligência operacional',
    timeout: 'Timeout WMS-003 · retry disponível'
  };
  return M[key] || M.error;
}

export function sanitizeWiDetail(detail) {
  if (!detail || typeof detail !== 'string') return null;
  return detail.length > 120 ? `${detail.slice(0, 117)}…` : detail;
}
