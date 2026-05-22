/**
 * Cache + deduplicação de pedidos do dashboard (evita N widgets = N× mesma API).
 */
import { dashboard } from './api';

const TTL = {
  summary: 2 * 60 * 1000,
  kpis: 2 * 60 * 1000,
  trend: 5 * 60 * 1000,
  chartsBundle: 5 * 60 * 1000,
  costs: 5 * 60 * 1000,
  forecasting: 5 * 60 * 1000,
  maintenance: 2 * 60 * 1000
};

const store = new Map();
const inflight = new Map();

function read(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

function write(key, data, ttlMs) {
  store.set(key, { data, expires: Date.now() + ttlMs });
}

function cachedFetch(key, ttlMs, fn) {
  const hit = read(key);
  if (hit !== null) return Promise.resolve(hit);

  if (inflight.has(key)) return inflight.get(key);

  const p = Promise.resolve()
    .then(fn)
    .then((data) => {
      write(key, data, ttlMs);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, p);
  return p;
}

export const dashboardCache = {
  getSummary() {
    return cachedFetch('dash:summary', TTL.summary, async () => {
      const r = await dashboard.getSummary();
      return r?.data?.summary ?? r?.summary ?? null;
    });
  },

  getKpis(userId = 'anon') {
    return cachedFetch(`dash:kpis:${userId}`, TTL.kpis, async () => {
      const r = await dashboard.getKPIs();
      return r?.data?.kpis ?? r?.kpis ?? [];
    });
  },

  getTrend(months = 6) {
    return cachedFetch(`dash:trend:${months}`, TTL.trend, async () => {
      const r = await dashboard.getTrend(months);
      return r?.data ?? r;
    });
  },

  /** Um único pedido para tendência, pulse, produção e custos (Centro de Comando). */
  getChartsBundle() {
    return cachedFetch('dash:charts:bundle', TTL.chartsBundle, async () => {
      const r = await dashboard.getChartsBundle();
      return r?.data ?? r;
    });
  },

  getCostsByOrigin() {
    return cachedFetch('dash:costs:origin', TTL.costs, async () => {
      const r = await dashboard.costs?.getByOrigin?.();
      return r?.data ?? r;
    });
  },

  getCostsExecutiveSummary() {
    return cachedFetch('dash:costs:exec', TTL.costs, async () => {
      const r = await dashboard.costs?.getExecutiveSummary?.();
      return r?.data ?? r;
    });
  },

  getCostsTopLoss() {
    return cachedFetch('dash:costs:toploss', TTL.costs, async () => {
      const r = await dashboard.costs?.getTopLoss?.();
      return r?.data ?? r;
    });
  },

  getForecastingProjections(metric = 'eficiencia') {
    return cachedFetch(`dash:forecast:${metric}`, TTL.forecasting, async () => {
      const r = await dashboard.forecasting?.getProjections?.(metric);
      return r?.data ?? r;
    });
  },

  getMaintenanceSummary() {
    return cachedFetch('dash:maint:summary', TTL.maintenance, async () => {
      const r = await dashboard.maintenance?.getSummary?.();
      return r?.data ?? r;
    });
  },

  /** Pré-carga ao abrir Centro de Comando (1 bundle + 1 summary). */
  prefetchCentroComando(userId) {
    return Promise.all([
      dashboardCache.getChartsBundle().catch(() => null),
      dashboardCache.getSummary().catch(() => null),
      dashboardCache.getKpis(userId).catch(() => [])
    ]);
  },

  invalidate(prefix) {
    for (const key of [...store.keys()]) {
      if (!prefix || key.startsWith(prefix)) store.delete(key);
    }
  }
};

export default dashboardCache;
