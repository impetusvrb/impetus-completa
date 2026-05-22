/**
 * Normalização de respostas de API para gráficos Recharts em todo o IMPETUS.
 */

export function normalizeTrendResponse(res) {
  const body = res?.data ?? res ?? {};
  const raw = body.data ?? body.trend ?? body;
  const arr = Array.isArray(raw) ? raw : [];
  const meta = body.meta ?? null;
  return {
    points: arr.map((d) => ({
      name: d.label || d.periodo || d.mes || d.name || '-',
      valor: d.valor ?? d.total ?? d.count ?? d.interactions ?? 0,
      meta: d
    })),
    meta,
    hasRealData: meta?.has_real_data !== false && arr.some((d) => (d.valor ?? d.total ?? 0) > 0)
  };
}

export function normalizeProductionDemandResponse(res) {
  const body = res?.data ?? res ?? {};
  const raw = body.data ?? body;
  const arr = Array.isArray(raw) ? raw : [];
  return {
    points: arr.map((d) => ({
      name: d.nome || d.label || '-',
      produção: d.produção ?? d.producao ?? d.valor ?? 0,
      demanda: d.demanda ?? d.meta ?? 0
    })),
    meta: body.meta ?? null
  };
}

export function trendToInteractions(points) {
  return points.map((p) => ({
    month: p.name,
    interactions: Number(p.valor) || 0
  }));
}

export function panelRowsToChartData(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    name: r.name ?? r.label ?? '-',
    valor: Number(r.valor ?? r.value ?? 0)
  }));
}

export function claudeOutputToChartRows(output = {}) {
  const labels = Array.isArray(output.labels) ? output.labels : [];
  const datasets = Array.isArray(output.datasets) ? output.datasets : [];
  if (!labels.length) return [];
  return labels.map((name, i) => {
    const row = { name: String(name).slice(0, 48), valor: 0 };
    datasets.forEach((ds, j) => {
      const v = Array.isArray(ds?.data) ? ds.data[i] : 0;
      const n = Number(v);
      if (j === 0) row.valor = Number.isFinite(n) ? n : 0;
      row[`s${j}`] = Number.isFinite(n) ? n : 0;
    });
    return row;
  });
}
