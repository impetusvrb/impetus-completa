/**
 * OPM-001B — Mensagens operacionais (sem stack/exception técnica).
 */
const FRIENDLY = Object.freeze({
  permission_denied: 'Não tem permissão para consultar os armazéns.',
  integration_unavailable: 'O serviço de armazéns está temporariamente indisponível.',
  api_unavailable: 'O serviço de armazéns está temporariamente indisponível.',
  operational_error: 'Não foi possível consultar os dados do armazém.',
  error: 'Não foi possível consultar os dados do armazém.',
  empty: 'Não existem armazéns registados para esta empresa.',
  timeout: 'A consulta excedeu o tempo limite. Tente actualizar.',
  partial_data: 'Alguns indicadores estão temporariamente indisponíveis.',
  offline: 'Sem ligação. Verifique a rede e tente novamente.',
  detail_load_failed: 'Não foi possível carregar os detalhes deste armazém.',
  create_success: 'Armazém registado com sucesso.',
  create_failed: 'Não foi possível registar o armazém.',
  create_denied: 'O seu perfil não permite criar armazéns.'
});

export function toWarehouseOperationalMessage(errorType, fallback = FRIENDLY.operational_error) {
  return FRIENDLY[errorType] || fallback;
}

export function sanitizeOperationalDetail(raw) {
  if (!raw) return null;
  const msg = String(raw);
  if (/not found|404|exception|stack|error:/i.test(msg)) {
    return null;
  }
  if (/503|403|401|500|timeout/i.test(msg)) {
    return null;
  }
  return null;
}

export function unavailableLabel() {
  return 'Dados indisponíveis';
}
