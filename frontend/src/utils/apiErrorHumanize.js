'use strict';

/**
 * Converte payloads de erro da API em texto legível (evita mostrar SYSTEM_DEGRADED cru na UI).
 * @param {Record<string, unknown>|null|undefined} responseData — tipicamente error.response.data
 * @param {string} [fallback]
 * @returns {string}
 */
export function humanizeApiError(responseData, fallback = 'Operação falhou.') {
  if (!responseData || typeof responseData !== 'object') return fallback;

  const code =
    typeof responseData.error === 'string' ? responseData.error : responseData.code;
  const msg = typeof responseData.message === 'string' ? responseData.message.trim() : '';

  if (code === 'SYSTEM_DEGRADED') {
    return msg || 'Sistema temporariamente em modo de proteção. Consulte Saúde do Sistema ou aguarde recuperação automática.';
  }

  if (msg) return msg;

  const errStr = typeof responseData.error === 'string' ? responseData.error.trim() : '';
  if (errStr && errStr !== 'SYSTEM_DEGRADED') return errStr;

  return fallback;
}
