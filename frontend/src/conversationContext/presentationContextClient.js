/**
 * CERT-VOICE-02 — Cliente do Executive Presentation Context
 */
import { dashboard } from '../services/api';

let _cachedPresentation = null;

/**
 * Sincroniza estado de apresentação com o servidor (fonte de verdade).
 * @param {{ enabled: boolean, presentation_level?: string }} opts
 */
export async function syncPresentationContext(opts = {}) {
  const enabled = opts.enabled === true;
  const presentation_level = String(opts.presentation_level || 'executive').trim();
  try {
    const res = await dashboard.setPresentationContext({
      enabled,
      presentation_level
    });
    const ctx = res?.data?.presentation_context;
    if (ctx) {
      _cachedPresentation = ctx;
      try {
        sessionStorage.setItem('impetus_executive_modo_apresentacao', ctx.enabled ? '1' : '0');
        sessionStorage.setItem('impetus_presentation_context', JSON.stringify(ctx));
      } catch (_) {}
    }
    return ctx;
  } catch (e) {
    console.warn('[presentationContextClient] sync', e?.message || e);
    try {
      sessionStorage.setItem('impetus_executive_modo_apresentacao', enabled ? '1' : '0');
    } catch (_) {}
    return null;
  }
}

export async function fetchPresentationContext() {
  try {
    const res = await dashboard.getPresentationContext();
    const ctx = res?.data?.presentation_context;
    if (ctx) {
      _cachedPresentation = ctx;
      try {
        sessionStorage.setItem('impetus_executive_modo_apresentacao', ctx.enabled ? '1' : '0');
        sessionStorage.setItem('impetus_presentation_context', JSON.stringify(ctx));
      } catch (_) {}
    }
    return ctx;
  } catch (e) {
    console.warn('[presentationContextClient] fetch', e?.message || e);
    return readLegacySessionPresentation();
  }
}

export function readLegacySessionPresentation() {
  try {
    const raw = sessionStorage.getItem('impetus_presentation_context');
    if (raw) return JSON.parse(raw);
    const flag = sessionStorage.getItem('impetus_executive_modo_apresentacao') === '1';
    if (flag) {
      return { enabled: true, presentation_level: 'executive', source: 'session_legacy' };
    }
  } catch (_) {}
  return { enabled: false };
}

export function getCachedPresentationContext() {
  return _cachedPresentation || readLegacySessionPresentation();
}

export function buildVoiceRealtimeParams(hint = '') {
  const ctx = getCachedPresentationContext();
  const params = {};
  if (hint) params.hint = String(hint).slice(0, 200);
  if (ctx?.enabled) {
    params.presentationRequested = '1';
    params.modoApresentacao = '1';
    if (ctx.presentation_level) params.presentationLevel = ctx.presentation_level;
  }
  return params;
}
