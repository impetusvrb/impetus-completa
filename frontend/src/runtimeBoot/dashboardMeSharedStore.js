/**
 * Deduplicação de GET /dashboard/me entre useVisibleModules e useDashboardContext.
 */
import { dashboard } from '../services/api';
import { markDashboardMeMs } from './dashboardBootMetrics';

let cache = null;
let cacheAt = 0;
let inflight = null;
const TTL_MS = 45_000;

export function getCachedDashboardMe() {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;
  return null;
}

export function invalidateDashboardMeCache() {
  cache = null;
  cacheAt = 0;
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
  inflight = dashboard
    .getMe({ signal })
    .then((r) => {
      cache = r?.data ?? null;
      cacheAt = Date.now();
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
