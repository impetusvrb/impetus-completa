'use strict';

const catalog = require('../../config/functionalAreaCatalog');
const functionalAxisResolver = require('../../services/functionalAxisResolver');
const { TAGS, log } = require('../observability/domainAuthorityLogger');
const { getStepPriority } = require('../policies/semanticPriorityPolicy');
const tenantOverrideLoader = require('../tenantOverrides/tenantOverrideLoader');

function _textBlob(user) {
  return [
    user.department,
    user.department_resolved_name,
    user.area,
    user.job_title,
    user.company_role_name,
    user.hr_responsibilities
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Extensão de prioridade semântica (Fase C.5) antes do resolver legado.
 * Não duplica lógica completa — enriquece sinais estruturais e delega.
 */
function resolveSemanticAxis(user) {
  const safe = user || {};
  const trace = [];

  const explicit = safe.functional_area || safe.company_role_dashboard_hint;
  if (explicit) {
    const id =
      catalog.isKnownId(catalog.normKey(explicit)) ?
        catalog.normKey(explicit) :
        catalog.resolveIdFromText(explicit);
    if (id) {
      trace.push({ step: 'functional_area_explicit', output: id, priority: getStepPriority('functional_area_explicit') });
      return _pack(id, 'functional_area_explicit', 1, trace, safe);
    }
  }

  if (safe.department) {
    const id = catalog.resolveIdFromText(safe.department);
    if (id) {
      trace.push({ step: 'department', output: id, priority: getStepPriority('department') });
      return _pack(id, 'department', 2, trace, safe);
    }
  }

  if (safe.company_role_name) {
    const id = catalog.resolveIdFromText(safe.company_role_name);
    if (id) {
      trace.push({ step: 'structural_role', output: id, priority: getStepPriority('structural_role') });
      return _pack(id, 'structural_role', 3, trace, safe);
    }
  }

  if (safe.company_role_dashboard_hint && !safe.functional_area) {
    const id = catalog.resolveIdFromText(safe.company_role_dashboard_hint);
    if (id) {
      trace.push({ step: 'structural_profile_hint', output: id, priority: getStepPriority('structural_profile_hint') });
      return _pack(id, 'structural_profile_hint', 4, trace, safe);
    }
  }

  if (safe.company_role_hierarchy_level != null && safe.hierarchy_level == null) {
    /* sinal hierárquico estrutural — não força eixo sozinho */
    trace.push({ step: 'organizational_hierarchy', note: 'structural_level_present', priority: getStepPriority('organizational_hierarchy') });
  }

  const legacy = functionalAxisResolver.resolveFunctionalAxis(safe);
  trace.push(...(legacy.inference_trace || []).map((t) => ({ ...t, via: 'functional_axis_resolver' })));

  log(TAGS.AXIS_INFERRED, {
    user_id: safe.id,
    functional_axis: legacy.functional_axis,
    source: legacy.source,
    priority: legacy.priority,
    trace_steps: trace.length
  });

  return {
    ...legacy,
    inference_trace: trace,
    semantic_priority_applied: true
  };
}

function _pack(id, source, priority, trace, user) {
  log(TAGS.AXIS_INFERRED, { user_id: user.id, functional_axis: id, source, priority });
  return {
    functional_axis: id,
    functional_area: id,
    functional_area_label: catalog.getLabel(id),
    axis: catalog.getAxis(id),
    source,
    priority,
    environmental_guard: catalog.hasEnvironmentalSemanticSignal(_textBlob(user)),
    inference_trace: trace,
    semantic_priority_applied: true
  };
}

module.exports = { resolveSemanticAxis };
