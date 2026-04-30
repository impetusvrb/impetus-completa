'use strict';

/**
 * Reduz ruído em evidências — considera impacto, repetição e entidades relacionadas.
 * Flag: UNIFIED_SIGNAL_FILTER
 */

function rowTsMs(row) {
  if (!row || row.created_at == null) return null;
  const t = new Date(row.created_at).getTime();
  return Number.isFinite(t) ? t : null;
}

function machineIdOf(row) {
  if (!row || typeof row !== 'object') return '';
  let metaMid = '';
  if (row.metadata != null && typeof row.metadata === 'object') {
    const mm = row.metadata.machine_id != null ? row.metadata.machine_id : row.metadata.machineId;
    if (mm != null) metaMid = String(mm).trim();
  }
  const m =
    row.machine_id != null
      ? row.machine_id
      : row.machineId != null
        ? row.machineId
        : metaMid || (row.equipamento != null ? row.equipamento : null);
  return m != null ? String(m).trim() : '';
}

/**
 * Deriva métricas de filtragem por item de evidência.
 * @param {object} e — { type, source, row? } ou objeto plano
 * @param {Record<string, number>} frequencyByKey
 */
function deriveSignalMetrics(e, frequencyByKey, distinctEntityCount) {
  const row = e && e.row && typeof e.row === 'object' ? e.row : e;
  const sevRaw = row.severity != null ? row.severity : row.severidade;
  const s = sevRaw != null ? String(sevRaw).toLowerCase() : '';
  let impact_score = 0.2;
  if (/crit|alta|high|sever/.test(s)) impact_score = 0.85;
  else if (/med|m(e|é)dia|medium/.test(s)) impact_score = 0.5;

  const key = e && e.type && e.source && row.id != null ? `${e.source}:${row.id}` : '';
  const fk = frequencyByKey && key ? frequencyByKey[key] : null;
  const frequency = fk != null ? fk : 1;

  const mid = machineIdOf(row);
  const related_entities = distinctEntityCount > 1 || mid ? Math.max(distinctEntityCount, mid ? 2 : 1) : 1;

  return { impact_score, frequency, related_entities, _machine_id: mid };
}

/**
 * @param {object} params
 * @param {object[]} [params.events]
 * @param {object|null} [params.impact_metrics]
 * @returns {object[]}
 */
function filterRelevantSignals({ events, impact_metrics }) {
  const list = Array.isArray(events) ? events : [];
  if (process.env.UNIFIED_SIGNAL_FILTER !== 'true') {
    return list.slice();
  }

  const imp = impact_metrics && typeof impact_metrics === 'object' ? impact_metrics : {};
  const costImp = Number(imp.cost_impact);
  const hasGlobalImpact = Number.isFinite(costImp) && costImp > 0.35;

  /** @type {Map<string, number>} */
  const freq = new Map();
  for (const e of list) {
    const row = e && e.row && typeof e.row === 'object' ? e.row : e;
    const k = `${e && e.source ? e.source : 'x'}:${row && row.id != null ? row.id : JSON.stringify(row).slice(0, 40)}`;
    freq.set(k, (freq.get(k) || 0) + 1);
  }
  const frequencyByKey = Object.fromEntries(freq);

  const machines = new Set();
  for (const e of list) {
    const row = e && e.row && typeof e.row === 'object' ? e.row : e;
    const mid = machineIdOf(row);
    if (mid) machines.add(mid);
  }
  const distinctEntityCount = machines.size;

  const filtered = list.filter((e) => {
    const m = deriveSignalMetrics(e, frequencyByKey, distinctEntityCount);
    const pass =
      m.impact_score > 0.3 ||
      m.frequency > 2 ||
      m.related_entities > 1 ||
      hasGlobalImpact;
    return pass;
  });

  try {
    console.info(
      '[UNIFIED_SIGNAL_FILTER]',
      JSON.stringify({
        in: list.length,
        out: filtered.length,
        skipped: false
      })
    );
  } catch (_l) {}

  return filtered.length ? filtered : list.slice();
}

module.exports = {
  filterRelevantSignals,
  deriveSignalMetrics,
  rowTsMs,
  machineIdOf
};
