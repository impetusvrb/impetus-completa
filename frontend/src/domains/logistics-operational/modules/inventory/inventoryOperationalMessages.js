const MESSAGES = Object.freeze({
  empty: 'Nenhum registo de inventário disponível para este tenant.',
  error: 'Não foi possível carregar o inventário. Tente actualizar.',
  timeout: 'Tempo de resposta excedido. Verifique conectividade e tente novamente.',
  integration_unavailable: 'Integração WMS temporariamente indisponível.',
  permission_denied: 'Sem permissão para consultar inventário.',
  partial: 'Dados parciais — alguns indicadores dependem de saldos ou movimentações.'
});

export function toInventoryOperationalMessage(key) {
  return MESSAGES[key] || MESSAGES.error;
}

export function unavailableLabel() {
  return '—';
}

export function sanitizeOperationalDetail(err) {
  if (!err || typeof err !== 'string') return null;
  if (/sql|stack|ECONN|jwt|token/i.test(err)) return null;
  return err.length > 120 ? `${err.slice(0, 117)}…` : err;
}
