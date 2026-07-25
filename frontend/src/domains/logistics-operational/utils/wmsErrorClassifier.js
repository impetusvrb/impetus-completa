/**
 * WMS-007 — Classificação de erros operacionais (presentation layer).
 */
export function classifyWmsError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  if (msg.includes('403') || msg.includes('forbidden') || msg.includes('permission')) {
    return 'permission_denied';
  }
  if (msg.includes('503') || msg.includes('wms_api_disabled') || msg.includes('api_unavailable')) {
    return 'api_unavailable';
  }
  if (msg.includes('401') || msg.includes('token')) {
    return 'permission_denied';
  }
  return 'operational_error';
}

export const WMS_ERROR_LABELS = Object.freeze({
  permission_denied: 'Permissão negada — perfil sem acesso a este módulo',
  api_unavailable: 'API WMS-003 indisponível — verificar activação piloto',
  operational_error: 'Erro operacional — falha na consulta'
});
