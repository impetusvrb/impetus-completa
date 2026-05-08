'use strict';

/**
 * ContextualModuleValidator (Phase 6, Part 6)
 * -------------------------------------------
 * Verifica a coerência da composição funcional para uma identidade.
 *
 *   - presença dos críticos (por function_type × area)
 *   - ausência dos proibidos
 *   - dependências satisfeitas
 *   - LGPD: cargos sem capability sensível não recebem high-LGPD
 *   - overload: respeitar limites
 *   - capability coerente: módulos têm capabilities pelo menos aproximadas
 *
 * Devolve um diagnóstico estruturado para alimentar telemetria/governance.
 */

const registry = require('./moduleRegistry');

const SEVERITY = Object.freeze({
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
});

function _toSet(arr) {
  return new Set(Array.isArray(arr) ? arr : []);
}

function validateComposition(args) {
  const { identity, allowed_module_ids } = args || {};
  const ident = identity || {};
  const allowedIds = Array.isArray(allowed_module_ids) ? allowed_module_ids : [];
  const allowedSet = new Set(allowedIds);
  const findings = [];

  // 1) críticos
  const critical = registry.getCriticalModulesFor(ident.function_type, ident.area);
  const missingCritical = critical.filter((id) => !allowedSet.has(id));
  if (missingCritical.length > 0) {
    findings.push({
      type: 'missing_critical_modules',
      severity: SEVERITY.HIGH,
      message: `Módulos críticos ausentes: ${missingCritical.join(', ')}`,
      affected: missingCritical
    });
  }

  // 2) proibidos presentes
  const forbidden = registry.getForbiddenModulesFor(ident.function_type, ident.area);
  const wrongPresent = forbidden.filter((id) => allowedSet.has(id));
  if (wrongPresent.length > 0) {
    findings.push({
      type: 'forbidden_modules_present',
      severity: SEVERITY.HIGH,
      message: `Módulos proibidos detectados: ${wrongPresent.join(', ')}`,
      affected: wrongPresent
    });
  }

  // 3) dependências
  const deps = [];
  for (const id of allowedIds) {
    const mod = registry.getModule(id);
    if (!mod) continue;
    for (const dep of mod.dependencies || []) {
      if (!allowedSet.has(dep)) {
        deps.push({ module_id: id, missing_dep: dep });
      }
    }
  }
  if (deps.length > 0) {
    findings.push({
      type: 'unsatisfied_dependencies',
      severity: SEVERITY.MEDIUM,
      message: 'Dependências não satisfeitas',
      affected: deps
    });
  }

  // 4) LGPD: high-scope só para função permitida
  const highLgpd = allowedIds.filter((id) => {
    const m = registry.getModule(id);
    return m && m.lgpd_scope === 'high';
  });
  const allowedHighLgpdFunctions = new Set(['decisao_estrategica', 'governanca', 'analise']);
  if (highLgpd.length > 0 && !allowedHighLgpdFunctions.has(ident.function_type)) {
    findings.push({
      type: 'lgpd_scope_mismatch',
      severity: SEVERITY.HIGH,
      message: 'Módulos de alto escopo LGPD entregues a função não autorizada',
      affected: highLgpd
    });
  }

  // 5) overload
  const max = registry.getMaxModulesFor(ident.function_type);
  if (allowedIds.length > max) {
    findings.push({
      type: 'interface_overload',
      severity: SEVERITY.MEDIUM,
      message: `Excesso de módulos (${allowedIds.length} > ${max})`,
      affected: allowedIds.slice(max)
    });
  }

  // 6) capability coerente
  const caps = _toSet(ident.capabilities);
  const incoherent = [];
  for (const id of allowedIds) {
    const mod = registry.getModule(id);
    if (!mod) continue;
    if (!Array.isArray(mod.required_capabilities) || mod.required_capabilities.length === 0) continue;
    if (mod.universal === true) continue;
    for (const c of mod.required_capabilities) {
      if (!caps.has(c)) {
        incoherent.push({ module_id: id, missing_capability: c });
        break;
      }
    }
  }
  if (incoherent.length > 0) {
    findings.push({
      type: 'capability_incoherence',
      severity: SEVERITY.MEDIUM,
      message: 'Módulos entregues sem capabilities de base',
      affected: incoherent
    });
  }

  // 7) score agregado
  const counts = {
    high: findings.filter((f) => f.severity === SEVERITY.HIGH).length,
    medium: findings.filter((f) => f.severity === SEVERITY.MEDIUM).length,
    low: findings.filter((f) => f.severity === SEVERITY.LOW).length
  };
  const trustPenalty = counts.high * 0.4 + counts.medium * 0.15 + counts.low * 0.05;
  const trust_score = Math.max(0, Math.min(1, 1 - trustPenalty));

  return {
    valid: counts.high === 0,
    trust_score: Number(trust_score.toFixed(3)),
    findings,
    counts,
    summary: {
      total_allowed: allowedIds.length,
      max_allowed: max,
      critical_required: critical,
      forbidden_required: forbidden
    }
  };
}

module.exports = {
  SEVERITY,
  validateComposition
};
