import { unavailableLabel } from '../inventory/inventoryOperationalMessages.js';

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function avgUnloadMinutes(orders) {
  const samples = [];
  for (const o of orders) {
    const m = o.metadata || {};
    const start = parseDate(m.unload_started_at);
    const end = parseDate(m.unload_completed_at || m.stock_updated_at || (o.status === 'completed' ? o.updated_at : null));
    if (start && end) samples.push((end - start) / 60000);
  }
  if (!samples.length) return null;
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
}

export function computeReceivingKpis({ orders = [], docks = [], loadMeta = null }) {
  let planned = 0;
  let completed = 0;
  let inspecting = 0;
  let quarantine = 0;
  let inspectionPending = 0;

  for (const o of orders) {
    const meta = o.metadata || {};
    const st = o.status;
    const asn = meta.asn_status;
    if (st === 'open' || asn === 'planned' || asn === 'in_transit') planned += 1;
    if (st === 'completed' || asn === 'completed') completed += 1;
    if (st === 'in_progress' || asn === 'inspecting' || asn === 'received') inspecting += 1;
    if (meta.quarantine || meta.inspection_status === 'quarantine') quarantine += 1;
    if (meta.inspection_status === 'pending' || meta.quality_hold) inspectionPending += 1;
  }

  const occupiedDockIds = new Set(
    orders.filter((o) => o.status === 'in_progress').map((o) => o.metadata?.dock_id).filter(Boolean)
  );
  const dockTotal = docks.length;
  const dockOccupied = occupiedDockIds.size;
  const avgUnload = avgUnloadMinutes(orders);
  const slaBreaches = orders.filter((o) => o.metadata?.sla_breach === true).length;

  const lastSync = loadMeta?.loaded_at
    ? new Date(loadMeta.loaded_at).toLocaleString('pt-BR')
    : unavailableLabel();

  return {
    items: [
      { id: 'planned', label: 'Recebimentos previstos', value: planned, color: 'var(--cyan)' },
      { id: 'completed', label: 'Recebimentos concluídos', value: completed, color: 'var(--green)' },
      { id: 'inspecting', label: 'Em conferência', value: inspecting, color: inspecting > 0 ? 'var(--amber)' : 'var(--text-secondary)' },
      { id: 'docks_occupied', label: 'Docas ocupadas', value: `${dockOccupied}/${dockTotal || '—'}`, color: dockOccupied > 0 ? 'var(--amber)' : 'var(--green)' },
      { id: 'avg_unload', label: 'Tempo médio descarga', value: avgUnload != null ? `${avgUnload} min` : '—', color: 'var(--text-secondary)' },
      { id: 'sla', label: 'SLA em risco', value: slaBreaches, color: slaBreaches > 0 ? 'var(--red)' : 'var(--green)' },
      { id: 'inspection', label: 'Aguardando inspeção', value: inspectionPending, color: inspectionPending > 0 ? 'var(--amber)' : 'var(--text-secondary)' },
      { id: 'quarantine', label: 'Em quarentena', value: quarantine, color: quarantine > 0 ? 'var(--red)' : 'var(--green)' },
      { id: 'sync', label: 'Última sincronização', value: lastSync, color: 'var(--text-tertiary)' }
    ],
    partial: !orders.length && loadMeta != null,
    gaps: []
  };
}

export function computeReceivingIntelligence({ orders = [], docks = [] }) {
  const supplierDelays = [];
  const dockBottlenecks = new Map();
  const divergences = [];
  const quarantine = [];
  const slaBySupplier = new Map();

  for (const o of orders) {
    const meta = o.metadata || {};
    if (meta.supplier_delay || meta.sla_breach) supplierDelays.push(o);
    if (meta.divergence || (meta.divergence_count || 0) > 0) divergences.push(o);
    if (meta.quarantine || meta.inspection_status === 'quarantine') quarantine.push(o);
    const sup = meta.supplier_name || o.supplier_ref;
    if (sup) {
      const cur = slaBySupplier.get(sup) || { ok: 0, breach: 0 };
      if (meta.sla_breach) cur.breach += 1;
      else cur.ok += 1;
      slaBySupplier.set(sup, cur);
    }
    if (meta.dock_id && o.status === 'in_progress') {
      dockBottlenecks.set(meta.dock_id, (dockBottlenecks.get(meta.dock_id) || 0) + 1);
    }
  }

  const stagnantDocks = [...dockBottlenecks.entries()].filter(([, c]) => c > 1);

  return {
    belowMin: supplierDelays.slice(0, 5),
    divergences: divergences.slice(0, 5),
    noMovement: stagnantDocks.slice(0, 5),
    critical: quarantine.slice(0, 5),
    stagnant: stagnantDocks.slice(0, 5),
    ruptureTrend: [...slaBySupplier.entries()].filter(([, v]) => v.breach > 0).slice(0, 5),
    counts: {
      belowMin: supplierDelays.length,
      divergences: divergences.length,
      noMovement: stagnantDocks.length,
      critical: quarantine.length,
      stagnant: stagnantDocks.length,
      ruptureTrend: [...slaBySupplier.values()].filter((v) => v.breach > 0).length,
      dockAvailable: Math.max(0, docks.length - new Set(orders.map((o) => o.metadata?.dock_id).filter(Boolean)).size)
    },
    labels: {
      belowMin: 'Atrasos fornecedor',
      divergences: 'Divergências recorrentes',
      noMovement: 'Gargalos por doca',
      critical: 'Materiais em quarentena',
      stagnant: 'Docas congestionadas',
      ruptureTrend: 'SLA por fornecedor'
    }
  };
}
