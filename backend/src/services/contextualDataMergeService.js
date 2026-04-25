'use strict';

/**
 * Junta resultados de `retrieveContextualData` (várias intenções) com deduplicação
 * por chaves estáveis (id, machine_id, product_id) sem APIs externas.
 */

/**
 * @param {Array<{ id?: string }>} rows
 * @param {string} key
 * @returns {unknown[]}
 */
function dedupeByField(rows, key) {
  const seen = new Set();
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row == null || typeof row !== 'object') continue;
    const k =
      row[key] != null && String(row[key]).trim() !== '' ? String(row[key]).trim() : null;
    if (k) {
      if (seen.has(k)) continue;
      seen.add(k);
    }
    out.push(row);
  }
  return out;
}

/**
 * Deduplicador genérico: tenta id, product_id, machine_id, key.
 * @param {unknown[]} rows
 * @returns {unknown[]}
 */
function dedupeRecords(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const seen = new Map();
  const out = [];
  for (const row of list) {
    if (row == null || typeof row !== 'object') continue;
    const o = /** @type {Record<string, unknown>} */ (row);
    const key =
      (o.id != null && String(o.id)) ||
      (o.product_id != null && String(o.product_id)) ||
      (o.machine_id != null && String(o.machine_id)) ||
      (o.key != null && String(o.key)) ||
      (o.asset_id != null && String(o.asset_id)) ||
      null;
    if (key) {
      if (seen.has(key)) continue;
      seen.set(key, true);
    } else {
      const sig = JSON.stringify(row);
      if (seen.has(`sig:${sig}`)) continue;
      seen.set(`sig:${sig}`, true);
    }
    out.push(row);
  }
  return out;
}

/**
 * Eventos: id preferencial; fallback machine_identifier + created_at.
 * @param {unknown[]} rows
 * @returns {unknown[]}
 */
function dedupeEvents(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const seen = new Set();
  const out = [];
  for (const row of list) {
    if (row == null || typeof row !== 'object') continue;
    const e = /** @type {Record<string, unknown>} */ (row);
    const k =
      (e.id != null && String(e.id)) ||
      [
        e.machine_id != null ? String(e.machine_id) : '',
        e.machine_identifier != null ? String(e.machine_identifier) : '',
        e.created_at != null ? String(e.created_at) : '',
        e.event_type != null ? String(e.event_type) : ''
      ]
        .filter(Boolean)
        .join('|') ||
      null;
    const idKey = k || JSON.stringify(e).slice(0, 200);
    if (seen.has(idKey)) continue;
    seen.add(idKey);
    out.push(row);
  }
  return out;
}

/**
 * Fusão profunda de `contextual_data` com regras por chave.
 * @param {Record<string, unknown>|null|undefined} a
 * @param {Record<string, unknown>|null|undefined} b
 * @returns {Record<string, unknown>}
 */
function deepMergeContextualData(a, b) {
  const base = a && typeof a === 'object' && !Array.isArray(a) ? { ...a } : {};
  if (b == null || typeof b !== 'object' || Array.isArray(b)) {
    return base;
  }
  const out = { ...base };
  for (const k of Object.keys(b)) {
    const bv = b[k];
    if (bv === undefined) continue;
    const av = out[k];
    if (k === 'users' && (Array.isArray(av) || Array.isArray(bv))) {
      out[k] = dedupeByField(
        [...(Array.isArray(av) ? av : []), ...(Array.isArray(bv) ? bv : [])],
        'id'
      );
    } else if (k === 'machines' && (Array.isArray(av) || Array.isArray(bv))) {
      out[k] = dedupeByField(
        [...(Array.isArray(av) ? av : []), ...(Array.isArray(bv) ? bv : [])],
        'id'
      );
    } else if ((k === 'events' || k === 'recent_events') && (Array.isArray(av) || Array.isArray(bv))) {
      out[k] = dedupeEvents([...(Array.isArray(av) ? av : []), ...(Array.isArray(bv) ? bv : [])]);
    } else if (k === 'correlation' && av && typeof av === 'object' && !Array.isArray(av) && typeof bv === 'object' && !Array.isArray(bv)) {
      const aC = /** @type {Record<string, unknown>} */ (av);
      const bC = /** @type {Record<string, unknown>} */ (bv);
      const aSum = Array.isArray(aC.machine_status_summary) ? aC.machine_status_summary : [];
      const bSum = Array.isArray(bC.machine_status_summary) ? bC.machine_status_summary : [];
      out[k] = {
        ...aC,
        ...bC,
        machine_status_summary: dedupeByField(
          /** @type {Array<{ machine_id?: string }>} */ ([...aSum, ...bSum]),
          'machine_id'
        )
      };
    } else if (k === 'learning_summary' && (Array.isArray(av) || Array.isArray(bv))) {
      out[k] = dedupeByField(
        [...(Array.isArray(av) ? av : []), ...(Array.isArray(bv) ? bv : [])],
        'machine_id'
      );
    } else if (k === 'correlation_insights' && (Array.isArray(av) || Array.isArray(bv))) {
      out[k] = Array.from(
        new Set(
          [...(Array.isArray(av) ? av : []), ...(Array.isArray(bv) ? bv : [])]
            .map((x) => (x != null ? String(x).trim() : ''))
            .filter(Boolean)
        )
      );
    } else if (k === 'prioritized_actions' && (Array.isArray(av) || Array.isArray(bv))) {
      out[k] = dedupeRecords([...(Array.isArray(av) ? av : []), ...(Array.isArray(bv) ? bv : [])]);
    } else if (k === 'work_orders' && (Array.isArray(av) || Array.isArray(bv))) {
      out[k] = dedupeByField(
        [...(Array.isArray(av) ? av : []), ...(Array.isArray(bv) ? bv : [])],
        'id'
      );
    } else if (k === 'metrics' && av && typeof av === 'object' && !Array.isArray(av) && bv && typeof bv === 'object' && !Array.isArray(bv)) {
      out[k] = { .../** @type {Record<string, unknown>} */ (av), .../** @type {Record<string, unknown>} */ (bv) };
    } else if (k === 'product') {
      if (bv == null) continue;
      if (!av || typeof av !== 'object' || Array.isArray(av)) {
        out[k] = typeof bv === 'object' && !Array.isArray(bv) ? { ...bv } : bv;
      } else if (typeof bv === 'object' && !Array.isArray(bv)) {
        const aP = /** @type {Record<string, unknown>} */ (av);
        const bP = /** @type {Record<string, unknown>} */ (bv);
        const idA = aP.id != null ? String(aP.id) : '';
        const idB = bP.id != null ? String(bP.id) : '';
        if (idA && idB && idA !== idB) {
          const acc = Array.isArray(out.products) ? out.products : [];
          out.products = dedupeRecords([...acc, aP, bP]);
          out[k] = bP;
        } else {
          out[k] = { ...aP, ...bP };
        }
      } else {
        out[k] = bv;
      }
    } else if (k === 'machine') {
      if (bv == null || typeof bv !== 'object' || Array.isArray(bv)) {
        if (av !== undefined) out[k] = av;
        continue;
      }
      if (!av || typeof av !== 'object' || Array.isArray(av)) {
        out[k] = { .../** @type {Record<string, unknown>} */ (bv) };
        continue;
      }
      const aM = /** @type {Record<string, unknown>} */ (av);
      const bM = /** @type {Record<string, unknown>} */ (bv);
      const idA = aM.id != null ? String(aM.id) : '';
      const idB = bM.id != null ? String(bM.id) : '';
      if (idA && idB && idA !== idB) {
        out.machines = dedupeByField(
          [
            ...(Array.isArray(out.machines) ? out.machines : []),
            aM,
            bM
          ],
          'id'
        );
        out[k] = bM;
      } else {
        out[k] = { ...aM, ...bM };
      }
    } else if (k === 'products' && (Array.isArray(av) || Array.isArray(bv))) {
      out[k] = dedupeRecords([...(Array.isArray(av) ? av : []), ...(Array.isArray(bv) ? bv : [])]);
    } else if (
      av &&
      typeof av === 'object' &&
      !Array.isArray(av) &&
      bv &&
      typeof bv === 'object' &&
      !Array.isArray(bv) &&
      !Array.isArray(av)
    ) {
      out[k] = deepMergeContextualData(
        /** @type {Record<string, unknown>} */ (av),
        /** @type {Record<string, unknown>} */ (bv)
      );
    } else {
      out[k] = bv;
    }
  }
  return out;
}

/**
 * Junta vários pacotes { kpis, events, assets, contextual_data }.
 * @param {Array<{ kpis?: unknown[]; events?: unknown[]; assets?: unknown[]; contextual_data?: Record<string, unknown> }|null|undefined>} resultsArray
 * @returns {{ kpis: unknown[]; events: unknown[]; assets: unknown[]; contextual_data: Record<string, unknown> }}
 */
function mergeContextualData(resultsArray) {
  if (!Array.isArray(resultsArray) || resultsArray.length === 0) {
    return { kpis: [], events: [], assets: [], contextual_data: {} };
  }
  const merged = {
    kpis: /** @type {unknown[]} */ ([]),
    events: /** @type {unknown[]} */ ([]),
    assets: /** @type {unknown[]} */ ([]),
    contextual_data: /** @type {Record<string, unknown>} */ ({})
  };
  for (const r of resultsArray) {
    if (r == null || typeof r !== 'object') continue;
    merged.kpis = dedupeRecords([...merged.kpis, ...((r.kpis) || [])]);
    merged.events = dedupeEvents([...merged.events, ...((r.events) || [])]);
    merged.assets = dedupeRecords([...merged.assets, ...((r.assets) || [])]);
    merged.contextual_data = deepMergeContextualData(merged.contextual_data, r.contextual_data || {});
  }
  return merged;
}

module.exports = {
  mergeContextualData,
  /** @internal */
  _dedupeRecords: dedupeRecords
};
