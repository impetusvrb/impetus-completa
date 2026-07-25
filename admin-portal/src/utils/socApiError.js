/**
 * Mensagens de erro contextualizadas para o Centro de Segurança.
 * Não mascara falhas — identifica origem provável quando o payload HTTP permite.
 */
export function formatSocApiError(err, context = 'operacao') {
  const status = err?.status;
  const data = err?.data;
  const raw = String(err?.message || 'Erro de rede').trim();

  if (status === 401 || data?.code === 'ADMIN_AUTH_REQUIRED' || data?.code === 'ADMIN_AUTH_INVALID') {
    return 'Sessão expirada ou token inválido — faça login novamente.';
  }

  if (status === 403 || data?.code === 'ADMIN_FORBIDDEN') {
    return 'Permissão insuficiente para esta operação.';
  }

  if (status === 504 || status === 502) {
    return 'Servidor indisponível — tente novamente em instantes.';
  }

  if (status === 404 && data?.success === false && raw === 'Not found') {
    return `HTTP 404 em ${context}: resposta neutra «Not found» (anti-recon pós-autenticação ou rota inexistente). Retry disponível.`;
  }

  if (status === 404) {
    return `HTTP 404 em ${context}: ${raw}`;
  }

  if (raw === 'Not found') {
    return `Falha em ${context}: endpoint não encontrado ou bloqueado.`;
  }

  return raw;
}
