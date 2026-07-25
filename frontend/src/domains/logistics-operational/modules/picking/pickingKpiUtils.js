import { unavailableLabel } from '../inventory/inventoryOperationalMessages.js';

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function avgPickMinutes(orders) {
  const samples = [];
  for (const o of orders) {
    const m = o.metadata || {};
    const start = parseDate(m.picking_started_at);
    const end = parseDate(m.picking_completed_at || (o.status === 'completed' ? o.updated_at : null));
    if (start && end) samples.push((end - start) / 60000);
  }
  if (!samples.length) return null;
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
}

function operatorProductivity(orders) {
  const map = new Map();
  for (const o of orders) {
    if (o.status !== 'completed') continue;
    const op = o.metadata?.operator_name || o.metadata?.operator || '—';
    map.set(op, (map.get(op) || 0) + 1);
  }
  if (!map.size) return '—';
  const top = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  return `${top[0]} (${top[1]})`;
}

export function computePickingKpis({ orders = [], loadMeta = null }) {
  let pending = 0;
  let picking = 0;
  let completed = 0;
  let exceptions = 0;
  let backlog = 0;

  for (const o of orders) {
    const meta = o.metadata || {};
    if (o.status === 'open' || o.status === 'assigned') pending += 1;
    if (o.status === 'picking' || meta.paused) picking += 1;
    if (o.status === 'completed') completed += 1;
    if (meta.exception || meta.stockout || meta.divergence) exceptions += 1;
    if (o.status !== 'completed' && o.status !== 'cancelled') backlog += 1;
  }

  const slaBreaches = orders.filter((o) => o.metadata?.sla_breach === true).length;
  const avgPick = avgPickMinutes(orders);
  const productivity = operatorProductivity(orders);
  const lastSync = loadMeta?.loaded_at
    ? new Date(loadMeta.loaded_at).toLocaleString('pt-BR')
    : unavailableLabel();

  return {
    items: [
      { id: 'pending', label: 'Ordens pendentes', value: pending, color: 'var(--cyan)' },
      { id: 'picking', label: 'Em separação', value: picking, color: picking > 0 ? 'var(--amber)' : 'var(--text-secondary)' },
      { id: 'completed', label: 'Ordens concluídas', value: completed, color: 'var(--green)' },
      { id: 'sla', label: 'SLA picking', value: slaBreaches, color: slaBreaches > 0 ? 'var(--red)' : 'var(--green)' },
      { id: 'productivity', label: 'Produtividade operador', value: productivity, color: 'var(--text-secondary)' },
      { id: 'avg_pick', label: 'Tempo médio separação', value: avgPick != null ? `${avgPick} min` : '—', color: 'var(--text-secondary)' },
      { id: 'backlog', label: 'Pendências', value: backlog, color: backlog > 0 ? 'var(--amber)' : 'var(--green)' },
      { id: 'exceptions', label: 'Excepções', value: exceptions, color: exceptions > 0 ? 'var(--red)' : 'var(--green)' },
      { id: 'sync', label: 'Última sincronização', value: lastSync, color: 'var(--text-tertiary)' }
    ],
    partial: !orders.length && loadMeta != null,
    gaps: []
  };
}

export function computePickingIntelligence({ orders = [] }) {
  const operatorLoad = new Map();
  const topProducts = new Map();
  const longRoutes = [];
  const divergences = [];
  const shiftProd = { morning: 0, afternoon: 0, night: 0 };
  const slaByOperator = new Map();

  for (const o of orders) {
    const meta = o.metadata || {};
    const op = meta.operator_name || meta.operator;
    if (op && (o.status === 'picking' || meta.paused)) {
      operatorLoad.set(op, (operatorLoad.get(op) || 0) + 1);
    }
    for (const line of meta.pick_lines || meta.lines || []) {
      const code = line.item_code || line.item_id;
      if (code) topProducts.set(code, (topProducts.get(code) || 0) + (Number(line.qty_picked) || 1));
    }
    if ((meta.route_distance_m || 0) > 500 || (meta.route_stops?.length || 0) > 15) longRoutes.push(o);
    if (meta.divergence || (meta.divergence_count || 0) > 0) divergences.push(o);

    if (o.status === 'completed' && meta.picking_completed_at) {
      const h = new Date(meta.picking_completed_at).getHours();
      if (h >= 6 && h < 14) shiftProd.morning += 1;
      else if (h >= 14 && h < 22) shiftProd.afternoon += 1;
      else shiftProd.night += 1;
    }
    if (op) {
      const cur = slaByOperator.get(op) || { ok: 0, breach: 0 };
      if (meta.sla_breach) cur.breach += 1;
      else if (o.status === 'completed') cur.ok += 1;
      slaByOperator.set(op, cur);
    }
  }

  const congested = [...operatorLoad.entries()].filter(([, c]) => c > 2);

  return {
    belowMin: congested.slice(0, 5),
    divergences: divergences.slice(0, 5),
    noMovement: longRoutes.slice(0, 5),
    critical: [...topProducts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ id: k, count: v })),
    stagnant: longRoutes.slice(0, 5),
    ruptureTrend: [...slaByOperator.entries()].filter(([, v]) => v.breach > 0).slice(0, 5),
    counts: {
      belowMin: congested.length,
      divergences: divergences.length,
      noMovement: longRoutes.length,
      critical: topProducts.size,
      stagnant: longRoutes.length,
      ruptureTrend: [...slaByOperator.values()].filter((v) => v.breach > 0).length,
      shiftMorning: shiftProd.morning,
      shiftAfternoon: shiftProd.afternoon,
      shiftNight: shiftProd.night
    },
    labels: {
      belowMin: 'Congestionamento operadores',
      divergences: 'Divergências recorrentes',
      noMovement: 'Rotas mais longas',
      critical: 'Produtos mais colectados',
      stagnant: 'Rotas extensas',
      ruptureTrend: 'SLA por operador'
    }
  };
}
