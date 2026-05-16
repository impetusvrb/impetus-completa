/**
 * WAVE 6 — Service Worker Bridge.
 * Registo opt-in do SW para futura capacidade offline-first.
 * Flag: VITE_SW_ENABLED (default false) — não activa SW em produção até prontos.
 */

const SW_ENABLED = import.meta.env.VITE_SW_ENABLED === 'true';
const SW_PATH = '/sw.js';

let _registration = null;

/**
 * Regista o service worker se habilitado e suportado.
 * @returns {Promise<ServiceWorkerRegistration | null>}
 */
export async function registerServiceWorker() {
  if (!SW_ENABLED) return null;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    console.info('[SW_BRIDGE] Service workers not supported in this environment.');
    return null;
  }
  try {
    _registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    console.info('[SW_BRIDGE] Service worker registered:', _registration.scope);
    return _registration;
  } catch (err) {
    console.warn('[SW_BRIDGE] Service worker registration failed:', err?.message || err);
    return null;
  }
}

/**
 * Retorna o registo actual ou null.
 * @returns {ServiceWorkerRegistration | null}
 */
export function getSwRegistration() {
  return _registration;
}

/**
 * Envia uma mensagem ao service worker activo.
 * @param {unknown} message
 */
export function postSwMessage(message) {
  if (!_registration || !_registration.active) return;
  try {
    _registration.active.postMessage(message);
  } catch (err) {
    console.warn('[SW_BRIDGE] postMessage failed:', err?.message || err);
  }
}
