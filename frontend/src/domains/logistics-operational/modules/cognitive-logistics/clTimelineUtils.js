import { buildWiConsolidatedTimelineEvents, buildWiTimelineDisplay } from '../warehouse-intelligence/wiTimelineUtils.js';

const SEVERITY_MAP = Object.freeze({
  high: 'high',
  medium: 'medium',
  low: 'low'
});

export const CL_TIMELINE_CATEGORY_FILTERS = Object.freeze([
  { id: 'all', label: 'Todas categorias' },
  { id: 'operational', label: 'Operacional' },
  { id: 'analytical', label: 'Analítico OPM-007' },
  { id: 'cognitive', label: 'Cognitivo OPM-008' },
  { id: 'predictive', label: 'Preditivo' }
]);

export const CL_SEVERITY_FILTERS = Object.freeze([
  { id: 'all', label: 'Todas severidades' },
  { id: 'high', label: 'Alta' },
  { id: 'medium', label: 'Média' },
  { id: 'low', label: 'Baixa' }
]);

export function buildClUnifiedTimeline({ snapshot, insights = [], recommendations = [] }) {
  const operational = buildWiConsolidatedTimelineEvents(snapshot).map((e) => ({
    ...e,
    category: 'operational',
    severity: 'low'
  }));

  const analytical = recommendations
    .filter((r) => r.source === 'OPM-007')
    .slice(0, 10)
    .map((r) => ({
      id: `wi-${r.id}`,
      ts: new Date().toISOString(),
      type: 'recommendation',
      category: 'analytical',
      severity: r.priority || 'medium',
      label: `[OPM-007] ${r.title}`,
      domain: 'warehouse_intelligence',
      domainLabel: 'Warehouse Intelligence'
    }));

  const cognitive = recommendations
    .filter((r) => !r.source || r.source !== 'OPM-007')
    .slice(0, 15)
    .map((r) => ({
      id: `cl-${r.id}`,
      ts: new Date().toISOString(),
      type: 'cognitive_recommendation',
      category: 'cognitive',
      severity: r.priority || 'medium',
      label: `[OPM-008] ${r.title}`,
      domain: 'cognitive_logistics',
      domainLabel: 'Cognitive Logistics'
    }));

  const predictive = insights.map((i) => ({
    id: `pred-${i.id}`,
    ts: new Date().toISOString(),
    type: 'predictive_insight',
    category: 'predictive',
    severity: i.severity || 'medium',
    label: `[Pred] ${i.title}`,
    domain: 'cognitive_logistics',
    domainLabel: 'Predictive'
  }));

  return [...operational, ...analytical, ...cognitive, ...predictive].sort(
    (a, b) => new Date(b.ts || 0) - new Date(a.ts || 0)
  );
}

export function buildClTimelineDisplay({
  events = [],
  periodDays = 30,
  warehouseFilter = '',
  categoryFilter = 'all',
  severityFilter = 'all',
  moduleFilter = 'all',
  limit = 40
}) {
  let list = [...events];

  if (periodDays && periodDays !== 'all') {
    const cutoff = Date.now() - Number(periodDays) * 86400000;
    list = list.filter((e) => new Date(e.ts || 0).getTime() >= cutoff);
  }
  if (warehouseFilter) {
    list = list.filter((e) => !e.warehouse_id || String(e.warehouse_id).includes(warehouseFilter));
  }
  if (categoryFilter && categoryFilter !== 'all') {
    list = list.filter((e) => e.category === categoryFilter);
  }
  if (severityFilter && severityFilter !== 'all') {
    list = list.filter((e) => SEVERITY_MAP[e.severity] === severityFilter || e.severity === severityFilter);
  }
  if (moduleFilter && moduleFilter !== 'all') {
    list = list.filter((e) => e.domain === moduleFilter || e.domainLabel?.toLowerCase().includes(moduleFilter));
  }

  return list.slice(0, limit);
}

export { buildWiTimelineDisplay };
