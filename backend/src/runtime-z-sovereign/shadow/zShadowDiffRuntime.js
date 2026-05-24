'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');
const { recordDivergence, emitSZ1 } = require('../observability/zSovereignObservability');

const COMPARABLE_KEYS = [
  'profile_code',
  'profile_label',
  'visible_modules',
  'sections',
  'kpis',
  'ia_data_depth',
  'is_tenant_admin',
  'functional_area'
];

function _setDiff(a = [], b = []) {
  const setA = new Set(a);
  const setB = new Set(b);
  const onlyA = [...setA].filter((x) => !setB.has(x));
  const onlyB = [...setB].filter((x) => !setA.has(x));
  const inter = [...setA].filter((x) => setB.has(x));
  const denom = Math.max(setA.size + setB.size - inter.length, 1);
  return { onlyA, onlyB, jaccard: Number((inter.length / denom).toFixed(3)) };
}

function _arrayItemsByKey(arr = [], keyField = 'key') {
  return (arr || [])
    .map((x) => (typeof x === 'string' ? x : x?.[keyField] || x?.id || x?.title))
    .filter(Boolean);
}

function compareLegacyVsSovereign(legacyPayload = null, sovereignPayload = null) {
  if (!flags.isShadowDiffEnabled()) {
    return { divergence_score: 0, runtime_skipped: true };
  }

  if (!legacyPayload || !sovereignPayload) {
    return {
      divergence_score: 1,
      payloads_present: { legacy: !!legacyPayload, sovereign: !!sovereignPayload },
      comparable: false
    };
  }

  const fieldDivergences = [];
  let scoreSum = 0;
  let scoreCount = 0;

  for (const key of COMPARABLE_KEYS) {
    const legacyVal = legacyPayload[key];
    const sovereignVal = sovereignPayload[key];

    if (Array.isArray(legacyVal) || Array.isArray(sovereignVal)) {
      const la = _arrayItemsByKey(legacyVal);
      const sa = _arrayItemsByKey(sovereignVal);
      const { onlyA, onlyB, jaccard } = _setDiff(la, sa);
      if (onlyA.length || onlyB.length) {
        fieldDivergences.push({ key, only_legacy: onlyA, only_sovereign: onlyB, jaccard });
      }
      scoreSum += 1 - jaccard;
      scoreCount += 1;
    } else if (typeof legacyVal === 'object' || typeof sovereignVal === 'object') {
      const same = JSON.stringify(legacyVal) === JSON.stringify(sovereignVal);
      if (!same) fieldDivergences.push({ key, mismatch: true });
      scoreSum += same ? 0 : 1;
      scoreCount += 1;
    } else {
      const same = legacyVal === sovereignVal;
      if (!same) {
        fieldDivergences.push({
          key,
          legacy_value: legacyVal,
          sovereign_value: sovereignVal
        });
      }
      scoreSum += same ? 0 : 1;
      scoreCount += 1;
    }
  }

  const divergence_score = Number(((scoreSum / Math.max(scoreCount, 1)) || 0).toFixed(3));
  const compatibility_score = Number((1 - divergence_score).toFixed(3));
  const sovereignty_score = Number(
    Math.max(
      0,
      Math.min(
        1,
        compatibility_score * 0.6 +
          (sovereignPayload.visible_modules?.length ? 0.15 : 0) +
          (sovereignPayload.kpis?.length ? 0.15 : 0) +
          (sovereignPayload.sections?.length ? 0.1 : 0)
      )
    ).toFixed(3)
  );

  recordDivergence(divergence_score);

  const result = {
    divergence_score,
    compatibility_score,
    sovereignty_score,
    field_divergences: fieldDivergences,
    safe_to_promote: divergence_score < 0.15 && sovereignPayload.profile_code === legacyPayload.profile_code,
    runtime: 'runtime_z',
    source: 'z_shadow_diff_runtime',
    auto_mutation: false
  };

  if (divergence_score >= 0.3) {
    emitSZ1('SHADOW_DIVERGENCE_HIGH', {
      score: divergence_score,
      fields: fieldDivergences.map((f) => f.key)
    });
  }

  return result;
}

module.exports = { compareLegacyVsSovereign };
