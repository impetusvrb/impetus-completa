/**
 * Logs assistivos opt-in (evita spam em produção).
 * Ativar: sessionStorage.setItem('IMPETUS_QUALITY_NAV_LOG','1') ou window.__IMPETUS_QUALITY_NAV_LOG = true
 */

export function qualityNavDebug(tag, payload) {
  try {
    const w = typeof window !== 'undefined' ? window : null;
    const on =
      (w && w.__IMPETUS_QUALITY_NAV_LOG === true) ||
      (typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem('IMPETUS_QUALITY_NAV_LOG') === '1');
    if (!on) return;
    // eslint-disable-next-line no-console
    console.info(tag, payload === undefined ? '' : payload);
  } catch {
    /* never throw */
  }
}
