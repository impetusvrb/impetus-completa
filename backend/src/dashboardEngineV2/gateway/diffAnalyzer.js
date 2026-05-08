'use strict';

/**
 * Diff Analyzer — compara as saídas de Motor A vs Motor B na forma
 * normalizada e produz um relatório curto, suficiente para auditoria
 * em modo shadow.
 *
 * Métricas calculadas:
 *   - jaccard_widgets       : similaridade de Jaccard entre conjuntos de IDs
 *   - widgets_only_a        : IDs presentes só em A
 *   - widgets_only_b        : IDs presentes só em B
 *   - widgets_intersection  : IDs em ambos
 *   - same_top_widget       : se o widget #1 é o mesmo
 *   - rank_correlation      : correlação de Spearman simplificada (-1..1)
 *   - area_match            : se a área resolvida bate
 *   - function_inferred_b   : function_type inferido por B (sem cf. com A)
 *   - capabilities_a / b    : conjuntos de capabilities (B é o oficial)
 *   - critical_divergence   : true se top-3 difere em mais de 1 posição
 *   - signature_a / b       : hash curto da sequência de widgets para
 *                             detectar drift entre execuções
 */

const crypto = require('crypto');

function _ids(normalized) {
  if (!normalized || !Array.isArray(normalized.modulos)) return [];
  return normalized.modulos.map((m) => m.id).filter(Boolean);
}

function _signature(ids) {
  const h = crypto.createHash('sha1').update((ids || []).join('|')).digest('hex');
  return h.slice(0, 10);
}

function _jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 1 : inter / union;
}

/**
 * Spearman simplificado: compara ranks dos widgets que aparecem em ambos.
 * Retorna número em [-1, 1] ou null se não houver intersecção ≥ 2.
 */
function _rankCorrelation(idsA, idsB) {
  const setB = new Map(idsB.map((id, idx) => [id, idx]));
  const pairs = [];
  idsA.forEach((id, idx) => {
    if (setB.has(id)) pairs.push([idx, setB.get(id)]);
  });
  const n = pairs.length;
  if (n < 2) return null;
  let sumDsq = 0;
  for (const [ra, rb] of pairs) {
    const d = ra - rb;
    sumDsq += d * d;
  }
  const denom = n * (n * n - 1);
  if (denom === 0) return 1;
  const rho = 1 - (6 * sumDsq) / denom;
  return Math.max(-1, Math.min(1, rho));
}

/**
 * Compara Motor A vs Motor B e devolve um diff estruturado e enxuto.
 * @param {object} normalizedA
 * @param {object} normalizedB
 * @returns {object} diff
 */
function computeDiff(normalizedA, normalizedB) {
  const idsA = _ids(normalizedA);
  const idsB = _ids(normalizedB);
  const setA = new Set(idsA);
  const setB = new Set(idsB);

  const onlyA = idsA.filter((id) => !setB.has(id));
  const onlyB = idsB.filter((id) => !setA.has(id));
  const inter = idsA.filter((id) => setB.has(id));

  const top3A = idsA.slice(0, 3);
  const top3B = idsB.slice(0, 3);
  const top3Diff = top3A.filter((id, idx) => top3B[idx] !== id).length;
  const criticalDivergence = top3Diff >= 2;

  const areaA = normalizedA?.identity?.area || normalizedA?.personalization?.functional_area || null;
  const areaB = normalizedB?.identity?.area || normalizedB?.personalization?.functional_area || null;
  const areaMatch = (areaA || null) === (areaB || null);

  return {
    same_top_widget: top3A[0] && top3B[0] && top3A[0] === top3B[0],
    top3_changes: top3Diff,
    critical_divergence: criticalDivergence,
    jaccard_widgets: Number(_jaccard(idsA, idsB).toFixed(3)),
    rank_correlation: _rankCorrelation(idsA, idsB),
    widgets_only_a: onlyA,
    widgets_only_b: onlyB,
    widgets_intersection: inter,
    counts: {
      a: idsA.length,
      b: idsB.length,
      intersection: inter.length
    },
    area_a: areaA,
    area_b: areaB,
    area_match: areaMatch,
    function_b: normalizedB?.identity?.function_type || null,
    primary_axis_b: normalizedB?.identity?.primary_axis || null,
    capabilities_a: normalizedA?.identity?.capabilities || [],
    capabilities_b: normalizedB?.identity?.capabilities || [],
    profile_code_a: normalizedA?.personalization?.profile_code || null,
    profile_code_b: normalizedB?.personalization?.profile_code || null,
    signature_a: _signature(idsA),
    signature_b: _signature(idsB),
    sequence_a: idsA,
    sequence_b: idsB
  };
}

module.exports = { computeDiff };
