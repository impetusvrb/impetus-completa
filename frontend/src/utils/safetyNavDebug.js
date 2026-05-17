export function safetyNavDebug(tag, payload) {
  try {
    const w = typeof window !== 'undefined' ? window : null;
    const on =
      (w && w.__IMPETUS_SAFETY_NAV_LOG === true) ||
      (typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem('IMPETUS_SAFETY_NAV_LOG') === '1');
    if (!on) return;
    console.info(tag, payload === undefined ? '' : payload);
  } catch {
    /* never throw */
  }
}
