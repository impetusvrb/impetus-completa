'use strict';

/**
 * Normaliza KPIs vindos do Motor A / serviços externos para um schema
 * estável usável pelo frontend soberano. Não altera valores; apenas
 * uniformiza chaves.
 */
function normalize(kpis = []) {
  if (!Array.isArray(kpis)) return [];
  return kpis
    .filter((k) => k && (k.key || k.id || k.title))
    .map((k, idx) => ({
      id: k.id || k.key || `kpi_${idx}`,
      key: k.key || k.id || `kpi_${idx}`,
      title: k.title || k.label || k.key || k.id,
      value: k.value ?? k.current_value ?? null,
      previous_value: k.previous_value ?? null,
      unit: k.unit || null,
      trend: k.trend || null,
      status: k.status || k.health || null,
      icon: k.icon || null,
      category: k.category || k.domain || null,
      meta: k.meta || k.metadata || null,
      raw: k
    }));
}

module.exports = { normalize };
