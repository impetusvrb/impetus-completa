import { useEffect, useRef } from 'react';

/**
 * Detecção de build stale pós-deploy — reload seguro único (sem loop).
 * Feature flag: VITE_BUILD_VERSION_GUARD (default true em produção)
 *
 * Não invalida localStorage/JWT. Apenas recarrega a página uma vez por build_id.
 */

const GUARD_ENABLED =
  import.meta.env.VITE_BUILD_VERSION_GUARD !== 'false' &&
  import.meta.env.VITE_BUILD_VERSION_GUARD !== '0';

const EMBEDDED_BUILD_ID =
  typeof __IMPETUS_BUILD_ID__ !== 'undefined' ? __IMPETUS_BUILD_ID__ : null;

const POLL_MS = parseInt(import.meta.env.VITE_BUILD_VERSION_POLL_MS || '300000', 10);
const STORAGE_KEY = 'impetus_last_reload_build_id';

async function fetchServerBuildId() {
  try {
    const base = import.meta.env.VITE_API_BASE || '';
    const res = await fetch(`${base}/api/system/frontend-build`, {
      cache: 'no-store',
      credentials: 'same-origin'
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.build_id || null;
  } catch {
    return null;
  }
}

function safeReloadOnce(newBuildId, reason) {
  if (!newBuildId) return;
  const lastReloaded = sessionStorage.getItem(STORAGE_KEY);
  if (lastReloaded === newBuildId) return;

  sessionStorage.setItem(STORAGE_KEY, newBuildId);
  console.info('[BuildVersionGuard] Reload seguro:', reason, newBuildId);
  window.location.reload();
}

/**
 * @param {{ enabled?: boolean }} [opts]
 */
export function useBuildVersionGuard(opts = {}) {
  const enabled = opts.enabled !== false && GUARD_ENABLED && !!EMBEDDED_BUILD_ID;
  const checking = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    const check = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        const serverBuildId = await fetchServerBuildId();
        if (!serverBuildId || serverBuildId === 'unknown') return;

        if (serverBuildId !== EMBEDDED_BUILD_ID) {
          safeReloadOnce(serverBuildId, 'server_build_mismatch');
        }
      } finally {
        checking.current = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    const intervalId = setInterval(check, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);
}

export default useBuildVersionGuard;
