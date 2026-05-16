/**
 * Router extensível por metadados (tenant-aware). Sem authority — apenas resolução declarativa.
 */

/**
 * @param {string} raw
 * @param {{ rules?: Array<{ match: RegExp, target: string }> }} [meta]
 */
export function routeQualityScan(raw, meta = {}) {
  const text = String(raw || '').trim();
  if (!text) return { kind: 'unknown', value: '' };

  const rules = meta.rules || DEFAULT_RULES;
  for (const r of rules) {
    if (r.match.test(text)) {
      return { kind: r.target, value: text, pattern: r.match.source };
    }
  }

  if (/^\d{8,14}$/.test(text)) return { kind: 'ean_or_material', value: text };
  if (/^[A-Z0-9._\-:/]+$/i.test(text) && text.length >= 6) return { kind: 'industrial_label', value: text };

  return { kind: 'unknown', value: text };
}

const DEFAULT_RULES = [
  { match: /^NCR[-_]?[A-Z0-9]+$/i, target: 'ncr' },
  { match: /^CAPA[-_]?[A-Z0-9]+$/i, target: 'capa' },
  { match: /^LPN[-_:.]?[A-Z0-9]+$/i, target: 'lpn' },
  { match: /^(LOT|LOTE)[-_:]?[A-Z0-9]+$/i, target: 'lot' },
  { match: /^EQ[-_]?[A-Z0-9]+$/i, target: 'equipment' },
  { match: /^INSP[-_]?[A-Z0-9]+$/i, target: 'inspection' }
];
