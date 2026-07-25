/**
 * Deduplicação de GET /dashboard/me entre useVisibleModules e useDashboardContext.
 */
import { dashboard } from '../services/api';
import { markDashboardMeMs } from './dashboardBootMetrics';

let cache = null;
let cacheAt = 0;
let cacheUserId = null;
let inflight = null;
const TTL_MS = 45_000;

function readCurrentUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return u?.id != null ? String(u.id) : null;
  } catch {
    return null;
  }
}

export function getCachedDashboardMe() {
  const uid = readCurrentUserId();
  if (!uid || uid !== cacheUserId) return null;
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;
  return null;
}

export function invalidateDashboardMeCache() {
  cache = null;
  cacheAt = 0;
  cacheUserId = null;
  inflight = null;
}

/**
 * @param {{ signal?: AbortSignal, force?: boolean }} [opts]
 */
export async function fetchDashboardMeShared(opts = {}) {
  const { signal, force } = opts;
  if (!force) {
    const hit = getCachedDashboardMe();
    if (hit) return { data: hit };
    if (inflight) return inflight;
  }

  const t0 = nowMs();
  const requestUserId = readCurrentUserId();
  inflight = dashboard
    .getMe({ signal })
    .then((r) => {
      const activeUserId = readCurrentUserId();
      if (requestUserId && activeUserId && requestUserId !== activeUserId) {
        return r;
      }
      cache = r?.data ?? null;
      cacheAt = Date.now();
      cacheUserId = activeUserId;
      markDashboardMeMs(Math.round(nowMs() - t0));
      return r;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
