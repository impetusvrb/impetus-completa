'use strict';

const domainRegistry = require('../registry/domainRegistry');
const { TAGS, log } = require('../observability/domainAuthorityLogger');

function _norm(id) {
  return String(id || '')
    .trim()
    .toLowerCase();
}

/**
 * Valida um artefacto contextual contra o domínio.
 * @param {string} axis
 * @param {string} artifactType - module | pipeline | widget | dashboard | insight | ai_context
 * @param {string} artifactId
 * @returns {{ allowed: boolean, reason?: string }}
 */
function validateArtifact(axis, artifactType, artifactId) {
  const domain = domainRegistry.getDomain(axis);
  const id = _norm(artifactId);
  if (!id) return { allowed: true };

  const deniedModules = (domain.denied_modules || []).map(_norm);
  const deniedPipelines = (domain.denied_pipelines || []).map(_norm);
  const globalDenied = domainRegistry.GLOBAL_DENIED.map(_norm);

  if (artifactType === 'module' || artifactType === 'menu_key') {
    if (globalDenied.includes(id) && axis !== 'admin') {
      return { allowed: false, reason: 'global_denied' };
    }
    if (deniedModules.includes(id)) {
      return { allowed: false, reason: 'domain_denied_module' };
    }
    return { allowed: true };
  }

  if (artifactType === 'pipeline') {
    if (deniedPipelines.some((d) => id.includes(d) || d.includes(id))) {
      return { allowed: false, reason: 'domain_denied_pipeline' };
    }
    return { allowed: true };
  }

  if (artifactType === 'widget' || artifactType === 'dashboard' || artifactType === 'insight') {
    const crossDenied = _crossDomainDenied(axis, id);
    if (crossDenied) return { allowed: false, reason: crossDenied };
    return { allowed: true };
  }

  if (artifactType === 'ai_context') {
    const crossDenied = _crossDomainDenied(axis, id);
    if (crossDenied) return { allowed: false, reason: crossDenied };
    return { allowed: true };
  }

  return { allowed: true };
}

/** Regras cross-domain obrigatórias (matriz enterprise). */
function _crossDomainDenied(axis, id) {
  const a = domainRegistry.normalizeAxis(axis);
  if (a === 'environmental' || a === 'sustainability' || a === 'esg' || a === 'utilities') {
    if (/quality|spc|capa|ncr|supplier_quality|raw_material/.test(id)) return 'environmental_blocks_quality';
  }
  if (a === 'quality') {
    if (/waste|emission|esg|environmental_governance|environment_intelligence/.test(id)) {
      return 'quality_blocks_environmental';
    }
  }
  if (a === 'hr') {
    if (/plc|telemetry|manuia|industrial_telemetry|opcua|mqtt/.test(id)) return 'hr_blocks_industrial';
  }
  if (a === 'finance') {
    if (/plc|telemetry|spc|sensor|opcua|industrial_telemetry/.test(id)) return 'finance_blocks_industrial';
  }
  if (a === 'compliance' || a === 'legal') {
    if (/production_shift|plc|oee/.test(id)) return 'governance_blocks_shop_floor';
  }
  return null;
}

function filterModules(modules, axis, meta = {}) {
  const input = Array.isArray(modules) ? modules : [];
  const allowed = [];
  const blocked = [];

  for (const mod of input) {
    const check = validateArtifact(axis, 'module', mod);
    if (check.allowed) {
      allowed.push(mod);
    } else {
      blocked.push({ module: mod, reason: check.reason });
      log(TAGS.MODULE_DENIED, {
        axis: domainRegistry.normalizeAxis(axis),
        module: mod,
        reason: check.reason,
        user_id: meta.user_id,
        profile_code: meta.profile_code
      });
    }
  }

  if (blocked.length > 0) {
    log(TAGS.ISOLATION_BLOCKED, {
      axis: domainRegistry.normalizeAxis(axis),
      blocked_count: blocked.length,
      blocked: blocked.slice(0, 12),
      user_id: meta.user_id
    });
  }

  return { modules: allowed, blocked };
}

function filterPipelines(pipelines, axis, meta = {}) {
  const input = Array.isArray(pipelines) ? pipelines : [];
  const allowed = [];
  const blocked = [];
  for (const p of input) {
    const check = validateArtifact(axis, 'pipeline', p);
    if (check.allowed) allowed.push(p);
    else {
      blocked.push({ pipeline: p, reason: check.reason });
      log(TAGS.PIPELINE_DENIED, { axis, pipeline: p, reason: check.reason, ...meta });
    }
  }
  return { pipelines: allowed, blocked };
}

function filterWidgets(widgets, axis) {
  const input = Array.isArray(widgets) ? widgets : [];
  return input.filter((w) => {
    const key = typeof w === 'string' ? w : w?.key;
    return validateArtifact(axis, 'widget', key).allowed;
  });
}

function assertNoContamination(axis, modules, pipelines = []) {
  const modResult = filterModules(modules, axis);
  const pipeResult = filterPipelines(pipelines, axis);
  const conflicts = [...modResult.blocked, ...pipeResult.blocked];
  if (conflicts.length > 0) {
    log(TAGS.CONFLICT, { axis, conflicts: conflicts.slice(0, 8) });
  }
  return conflicts.length === 0;
}

module.exports = {
  validateArtifact,
  filterModules,
  filterPipelines,
  filterWidgets,
  assertNoContamination
};
