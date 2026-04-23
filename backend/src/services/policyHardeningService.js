'use strict';

/**
 * Policy Hardening Engine — deep merge, locked rules, resolução por restritividade.
 * Não altera rotas; consumido por policyEngineService. Enforcement continua no backend.
 */

const MAX_MERGE_DEPTH = 40;

/** @typedef {{ value: unknown, locked: boolean }} NormalizedRuleLeaf */

function cloneJson(obj) {
  if (obj === undefined || obj === null) return obj;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

function isRuleLeaf(v) {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.prototype.hasOwnProperty.call(v, 'value')
  );
}

/**
 * Deep merge: objetos recursivos; arrays substituídos integralmente; folhas `{ value, locked }` tratadas como objeto (merge superficial na folha).
 */
function deepMergePolicies(basePolicy, overridePolicy, depth = 0) {
  if (depth > MAX_MERGE_DEPTH) return cloneJson(overridePolicy !== undefined ? overridePolicy : basePolicy);
  if (overridePolicy === undefined || overridePolicy === null) {
    return basePolicy !== undefined && basePolicy !== null ? cloneJson(basePolicy) : {};
  }
  if (Array.isArray(overridePolicy)) {
    return cloneJson(overridePolicy);
  }
  if (typeof overridePolicy !== 'object') {
    return overridePolicy;
  }

  const base =
    basePolicy !== null && typeof basePolicy === 'object' && !Array.isArray(basePolicy) ? cloneJson(basePolicy) : {};

  for (const k of Object.keys(overridePolicy)) {
    const ov = overridePolicy[k];
    if (Array.isArray(ov)) {
      base[k] = cloneJson(ov);
      continue;
    }
    if (ov !== null && typeof ov === 'object') {
      const bv = base[k];
      if (isRuleLeaf(ov) || isRuleLeaf(bv)) {
        base[k] = { ...(isRuleLeaf(bv) ? bv : {}), ...ov };
      } else {
        base[k] = deepMergePolicies(bv, ov, depth + 1);
      }
    } else {
      base[k] = ov;
    }
  }
  return base;
}

function toLeaf(v) {
  if (v === undefined) return null;
  if (isRuleLeaf(v)) return { value: v.value, locked: !!v.locked };
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) return null;
  return { value: v, locked: false };
}

function composeLeaf(value, prevA, prevB) {
  const la = toLeaf(prevA);
  const lb = toLeaf(prevB);
  const locked = !!(la?.locked || lb?.locked);
  return { value, locked };
}

const SENSITIVE_ACTION_RANK = { block: 4, anonymize: 3, limit: 2, allow: 1 };

const DETAIL_RANK = { low: 3, medium: 2, high: 1 };

/**
 * Retorna o valor mais restritivo para a chave de regra indicada.
 */
function resolveMostRestrictiveRule(ruleKey, ruleA, ruleB) {
  const k = String(ruleKey || '').toLowerCase();
  const a = ruleA;
  const b = ruleB;

  if (a === b) return a;

  if (k === 'require_human_validation' || k === 'block_sensitive_data') {
    if (a === true || b === true) return true;
    if (a === false || b === false) return false;
  }

  if (k === 'sensitive_data_action' || k.endsWith('_data_action')) {
    const ra = SENSITIVE_ACTION_RANK[String(a).toLowerCase()] || 0;
    const rb = SENSITIVE_ACTION_RANK[String(b).toLowerCase()] || 0;
    if (ra === rb) return a;
    return ra > rb ? a : b;
  }

  if (k === 'max_response_detail' || k === 'max_detail_level') {
    const ra = DETAIL_RANK[String(a).toLowerCase()] || 0;
    const rb = DETAIL_RANK[String(b).toLowerCase()] || 0;
    if (ra === rb) return a;
    return ra > rb ? a : b;
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === true || b === true ? true : false;
  }

  return a;
}

/**
 * Após deep merge, reverte alterações em chaves locked no nível base.
 * @returns {{ merged: object, corrections: string[] }}
 */
function enforceLockedRules(basePolicy, incomingPolicy) {
  const merged = deepMergePolicies(basePolicy || {}, incomingPolicy || {});
  const corrections = [];
  const base = basePolicy && typeof basePolicy === 'object' ? basePolicy : {};

  for (const k of Object.keys(base)) {
    const bl = toLeaf(base[k]);
    if (!bl || !bl.locked) continue;
    const ml = toLeaf(merged[k]);
    const curVal = ml ? ml.value : merged[k];
    if (curVal !== bl.value) {
      merged[k] = { value: bl.value, locked: true };
      corrections.push(k);
    }
  }
  return { merged, corrections };
}

function applyRestrictiveResolution(basePolicy, incomingPolicy, merged, lockedKeys, audit) {
  const lockSet = new Set(lockedKeys);
  const inc = incomingPolicy && typeof incomingPolicy === 'object' ? incomingPolicy : {};
  const base = basePolicy && typeof basePolicy === 'object' ? basePolicy : {};
  const fixed = cloneJson(merged);

  for (const k of Object.keys(inc)) {
    if (lockSet.has(k)) continue;
    if (Array.isArray(inc[k])) continue;

    const bl = toLeaf(base[k]);
    const il = toLeaf(inc[k]);
    if (!bl || !il) continue;
    if (bl.value === il.value) {
      fixed[k] = composeLeaf(bl.value, base[k], inc[k]);
      continue;
    }

    const vr = resolveMostRestrictiveRule(k, bl.value, il.value);
    const deepMergedLeaf = toLeaf(fixed[k]);
    const deepVal = deepMergedLeaf ? deepMergedLeaf.value : fixed[k];

    if (vr !== deepVal || bl.value !== il.value) {
      audit.conflict_detected = true;
      if (!audit.affected_rules.includes(k)) audit.affected_rules.push(k);
    }
    fixed[k] = composeLeaf(vr, base[k], inc[k]);
  }

  return fixed;
}

/**
 * Ordem: políticas menos específicas primeiro (global → … → empresa).
 * Fluxo por camada: deep merge implícito em enforceLockedRules + correção locked + resolução restritiva.
 */
function mergePoliciesWithHardening(policiesOrdered) {
  let acc = {};
  const audit = {
    conflict_detected: false,
    resolved_by: null,
    affected_rules: []
  };
  let anyLockEnforcement = false;

  for (const piece of policiesOrdered) {
    if (!piece || typeof piece !== 'object') continue;
    const { merged: afterDeep, corrections } = enforceLockedRules(acc, piece);
    if (corrections.length) anyLockEnforcement = true;
    for (const ck of corrections) {
      audit.conflict_detected = true;
      if (!audit.affected_rules.includes(ck)) audit.affected_rules.push(ck);
    }
    acc = applyRestrictiveResolution(acc, piece, afterDeep, corrections, audit);
  }

  if (audit.conflict_detected) {
    audit.resolved_by = anyLockEnforcement ? 'locked_precedence' : 'most_restrictive';
  }

  return { merged: acc, policy_enforcement: audit };
}

/**
 * Remove wrapper `{ value, locked }` para consumo do policyEnforcementService (regras planas).
 */
function unwrapRulesForEnforcement(obj, depth = 0) {
  if (obj === undefined || obj === null) return obj;
  if (depth > MAX_MERGE_DEPTH) return obj;
  if (Array.isArray(obj)) return obj.map((x) => unwrapRulesForEnforcement(x, depth + 1));
  if (typeof obj !== 'object') return obj;

  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && isRuleLeaf(v)) {
      const inner = v.value;
      if (inner !== null && typeof inner === 'object' && !Array.isArray(inner) && !isRuleLeaf(inner)) {
        out[k] = unwrapRulesForEnforcement(inner, depth + 1);
      } else if (inner !== null && typeof inner === 'object' && Array.isArray(inner)) {
        out[k] = cloneJson(inner);
      } else {
        out[k] = inner;
      }
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = unwrapRulesForEnforcement(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

module.exports = {
  deepMergePolicies,
  enforceLockedRules,
  resolveMostRestrictiveRule,
  mergePoliciesWithHardening,
  unwrapRulesForEnforcement,
  isRuleLeaf,
  MAX_MERGE_DEPTH
};
