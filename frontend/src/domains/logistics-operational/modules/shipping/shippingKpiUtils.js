import { unavailableLabel } from '../inventory/inventoryOperationalMessages.js';

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function avgLoadingMinutes(orders) {
  const samples = [];
  for (const o of orders) {
    const m = o.metadata || {};
    const start = parseDate(m.loading_started_at);
    const end = parseDate(m.loading_completed_at || (o.status === 'shipped' ? o.updated_at : null));
    if (start && end) samples.push((end - start) / 60000);
  }
  if (!samples.length) return null;
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
}

export function computeShippingKpis({ orders = [], docks = [], loadMeta = null }) {
  let ready = 0;
  let loading = 0;
  let shipped = 0;
  let exceptions = 0;
  let awaitingTransport = 0;

  for (const o of orders) {
    const meta = o.metadata || {};
    const st = o.status;
    if (st === 'shipped') shipped += 1;
    if (meta.loading || st === 'staged') loading += 1;
    if (st === 'open' || st === 'staged') ready += 1;
    if (meta.exception || meta.divergence) exceptions += 1;
    if (meta.ready && !meta.vehicle_plate && st !== 'shipped') awaitingTransport += 1;
  }

  const occupiedDocks = new Set(
    orders.filter((o) => o.metadata?.loading || o.status === 'staged').map((o) => o.metadata?.outbound_dock_id).filter(Boolean)
  );
  const slaBreaches = orders.filter((o) => o.metadata?.sla_breach === true).length;
  const avgLoad = avgLoadingMinutes(orders);

  const lastSync = loadMeta?.loaded_at
    ? new Date(loadMeta.loaded_at).toLocaleString('pt-BR')
    : unavailableLabel();

  return {
    items: [
      { id: 'ready', label: 'Prontas expedição', value: ready, color: 'var(--cyan)' },
      { id: 'loading', label: 'Carregamentos activos', value: loading, color: loading > 0 ? 'var(--amber)' : 'var(--text-secondary)' },
      { id: 'shipped', label: 'Ordens expedidas', value: shipped, color: 'var(--green)' },
      { id: 'sla', label: 'SLA expedição', value: slaBreaches, color: slaBreaches > 0 ? 'var(--red)' : 'var(--green)' },
      { id: 'outbound_docks', label: 'Docas saída ocupadas', value: `${occupiedDocks.size}/${docks.length || '—'}`, color: occupiedDocks.size > 0 ? 'var(--amber)' : 'var(--green)' },
      { id: 'awaiting_transport', label: 'Transportes aguardando', value: awaitingTransport, color: awaitingTransport > 0 ? 'var(--amber)' : 'var(--text-secondary)' },
      { id: 'exceptions', label: 'Excepções expedição', value: exceptions, color: exceptions > 0 ? 'var(--red)' : 'var(--green)' },
      { id: 'avg_loading', label: 'Tempo médio carregamento', value: avgLoad != null ? `${avgLoad} min` : '—', color: 'var(--text-secondary)' },
      { id: 'sync', label: 'Última sincronização', value: lastSync, color: 'var(--text-tertiary)' }
    ],
    partial: !orders.length && loadMeta != null,
    gaps: []
  };
}

export function computeShippingIntelligence({ orders = [] }) {
  const delays = [];
  const dockUtil = new Map();
  const divergences = [];
  const slaByCarrier = new Map();
  const operatorProd = new Map();

  for (const o of orders) {
    const meta = o.metadata || {};
    if (meta.shipping_delay || meta.sla_breach) delays.push(o);
    if (meta.divergence) divergences.push(o);
    const carrier = meta.carrier_name || o.carrier_ref;
    if (carrier) {
      const cur = slaByCarrier.get(carrier) || { ok: 0, breach: 0 };
      if (meta.sla_breach) cur.breach += 1;
      else if (o.status === 'shipped') cur.ok += 1;
      slaByCarrier.set(carrier, cur);
    }
    const op = meta.operator_name || meta.operator;
    if (op && o.status === 'shipped') operatorProd.set(op, (operatorProd.get(op) || 0) + 1);
    if (meta.outbound_dock_id) {
      dockUtil.set(meta.outbound_dock_id, (dockUtil.get(meta.outbound_dock_id) || 0) + 1);
    }
  }

  const congestedDocks = [...dockUtil.entries()].filter(([, c]) => c > 1);

  return {
    belowMin: delays.slice(0, 5),
    divergences: divergences.slice(0, 5),
    noMovement: congestedDocks.slice(0, 5),
    critical: [...operatorProd.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ id: k, count: v })),
    stagnant: congestedDocks.slice(0, 5),
    ruptureTrend: [...slaByCarrier.entries()].filter(([, v]) => v.breach > 0).slice(0, 5),
    counts: {
      belowMin: delays.length,
      divergences: divergences.length,
      noMovement: congestedDocks.length,
      critical: operatorProd.size,
      stagnant: congestedDocks.length,
      ruptureTrend: [...slaByCarrier.values()].filter((v) => v.breach > 0).length
    },
    labels: {
      belowMin: 'Atraso expedição',
      divergences: 'Divergências transportadora',
      noMovement: 'Utilização docas',
      critical: 'Produtividade operador',
      stagnant: 'Docas congestionadas',
      ruptureTrend: 'SLA por cliente/transportadora'
    }
  };
}
