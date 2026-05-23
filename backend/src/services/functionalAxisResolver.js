'use strict';

/**
 * Resolver canónico de eixo / área funcional com prioridade semântica oficial.
 *
 * Prioridade:
 * 1. functional_area explícita (manual)
 * 2. company_role_dashboard_hint
 * 3. department (texto + department_resolved_name)
 * 4. job_title / cargo formal
 * 5. area (campo legado)
 * 6. hr_responsibilities / descrição
 * 7. inferência por texto agregado (catálogo)
 * 8. profileContextInterpreter (Motor B) — sem forçar quality
 * 9. inferAreaFromJobTitle — genéricos "coordenador" só se sem sinal ambiental
 * 10. role default (NUNCA quality por coordenador isolado)
 */

const catalog = require('../config/functionalAreaCatalog');
const { inferAreaFromJobTitle } = require('../config/dashboardProfiles');

let _profileContextInterpreter = null;
function _interpreter() {
  if (_profileContextInterpreter !== null) return _profileContextInterpreter;
  try {
    _profileContextInterpreter = require('./profileContextInterpreter');
  } catch {
    _profileContextInterpreter = false;
  }
  return _profileContextInterpreter;
}

const AXIS_TO_FUNCTIONAL = Object.freeze({
  eixo_ambiental: 'environmental',
  eixo_sustentabilidade: 'sustainability',
  eixo_utilidades: 'utilities',
  eixo_qualidade: 'quality',
  eixo_manutencao: 'maintenance',
  eixo_operacional: 'operations',
  eixo_humano: 'hr',
  eixo_financeiro: 'finance',
  eixo_planejamento: 'pcp',
  eixo_seguranca: 'safety',
  eixo_logistica: 'logistics',
  eixo_executivo: 'executive',
  eixo_laboratorial: 'laboratory'
});

function _log(tag, payload) {
  try {
    console.log(tag, JSON.stringify({ ts: new Date().toISOString(), ...payload }));
  } catch {
    /* never throw */
  }
}

function _resolveFromExplicit(user) {
  const raw = user.functional_area || user.company_role_dashboard_hint;
  if (!raw) return null;
  const norm = catalog.normKey(raw);
  if (catalog.isKnownId(norm)) return { id: norm, source: 'functional_area_explicit' };
  const fromText = catalog.resolveIdFromText(raw);
  if (fromText) return { id: fromText, source: 'functional_area_explicit' };
  return null;
}

function _textBlob(user) {
  return [
    user.department,
    user.department_resolved_name,
    user.area,
    user.job_title,
    user.hr_responsibilities,
    user.descricao_funcional,
    user.description,
    user.descricao,
    user.bio
  ]
    .filter(Boolean)
    .join(' ');
}

function _resolveFromInterpreter(user, environmentalGuard) {
  const interp = _interpreter();
  if (!interp?.interpretProfileContext) return null;
  try {
    const ctx = interp.interpretProfileContext(user);
    const primary = ctx?.primary_axis;
    if (!primary) return null;
    if (environmentalGuard && primary === 'eixo_qualidade') {
      _log('[QUALITY_AXIS_BLOCKED]', {
        user_id: user.id,
        reason: 'environmental_semantic_guard',
        would_be_axis: primary,
        department: user.department,
        job_title: user.job_title
      });
      const envAxis = (ctx.axes || []).find((a) =>
        ['eixo_ambiental', 'eixo_sustentabilidade', 'eixo_utilidades'].includes(a)
      );
      if (envAxis && AXIS_TO_FUNCTIONAL[envAxis]) {
        return { id: AXIS_TO_FUNCTIONAL[envAxis], source: 'context_interpreter_environmental' };
      }
      return { id: 'environmental', source: 'context_interpreter_environmental_fallback' };
    }
    const mapped = AXIS_TO_FUNCTIONAL[primary];
    if (mapped) return { id: mapped, source: 'context_interpreter' };
  } catch (e) {
    _log('[CONTEXTUAL_DOMAIN_INFERENCE]', { step: 'interpreter_error', error: e?.message });
  }
  return null;
}

/**
 * @param {object} user
 * @returns {{ functional_axis: string, functional_area: string, source: string, priority: number, inference_trace: object[] }}
 */
function resolveFunctionalAxis(user) {
  const safe = user || {};
  const trace = [];
  const blob = _textBlob(safe);
  const environmentalGuard = catalog.hasEnvironmentalSemanticSignal(blob);

  let resolved = null;
  let priority = 99;

  const explicit = _resolveFromExplicit(safe);
  if (explicit) {
    resolved = explicit;
    priority = 1;
    trace.push({ step: 'explicit', output: explicit.id });
    _log('[FUNCTIONAL_AXIS_MANUAL_PRIORITY]', {
      user_id: safe.id,
      functional_axis: explicit.id,
      source: explicit.source
    });
  }

  if (!resolved && safe.department) {
    const id = catalog.resolveIdFromText(safe.department);
    if (id) {
      resolved = { id, source: 'department' };
      priority = 2;
      trace.push({ step: 'department', input: safe.department, output: id });
    }
  }

  if (!resolved && safe.department_resolved_name) {
    const id = catalog.resolveIdFromText(safe.department_resolved_name);
    if (id) {
      resolved = { id, source: 'department_resolved_name' };
      priority = 2;
      trace.push({ step: 'department_resolved_name', output: id });
    }
  }

  if (!resolved && safe.job_title) {
    const id = catalog.resolveIdFromText(safe.job_title);
    if (id) {
      resolved = { id, source: 'job_title' };
      priority = 4;
      trace.push({ step: 'job_title_text', output: id });
    }
  }

  if (!resolved && safe.area) {
    const id = catalog.resolveIdFromText(safe.area);
    if (id) {
      resolved = { id, source: 'area_field' };
      priority = 5;
      trace.push({ step: 'area', output: id });
    }
  }

  if (!resolved && safe.hr_responsibilities) {
    const id = catalog.resolveIdFromText(safe.hr_responsibilities);
    if (id) {
      resolved = { id, source: 'hr_responsibilities' };
      priority = 6;
      trace.push({ step: 'hr_responsibilities', output: id });
    }
  }

  if (!resolved && blob) {
    const id = catalog.resolveIdFromText(blob);
    if (id) {
      resolved = { id, source: 'aggregated_text' };
      priority = 7;
      trace.push({ step: 'aggregated_text', output: id });
    }
  }

  if (!resolved) {
    const fromInterp = _resolveFromInterpreter(safe, environmentalGuard);
    if (fromInterp) {
      resolved = fromInterp;
      priority = 8;
      trace.push({ step: 'context_interpreter', output: fromInterp.id });
    }
  }

  if (!resolved && safe.job_title && !environmentalGuard) {
    const legacy = inferAreaFromJobTitle(safe.job_title);
    if (legacy && catalog.isKnownId(legacy)) {
      const genericOnly =
        /^(coordenador|gerente|supervisor|diretor)$/i.test(catalog.normKey(safe.job_title)) ||
        catalog.normKey(safe.job_title) === legacy;
      if (!genericOnly) {
        resolved = { id: legacy, source: 'job_title_legacy' };
        priority = 9;
        trace.push({ step: 'job_title_legacy', output: legacy });
      }
    }
  }

  if (!resolved) {
    const role = catalog.normKey(safe.role);
    if (role === 'admin') resolved = { id: 'admin', source: 'role_default' };
    else if (role === 'rh' || role === 'recursos_humanos') resolved = { id: 'hr', source: 'role_default' };
    else if (role === 'financeiro') resolved = { id: 'finance', source: 'role_default' };
    else if (environmentalGuard) resolved = { id: 'environmental', source: 'environmental_guard' };
    else if (['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor'].includes(role)) {
      resolved = { id: 'operations', source: 'leadership_neutral_default' };
    } else {
      resolved = { id: 'production', source: 'fallback' };
    }
    priority = 10;
    trace.push({ step: 'fallback', role, output: resolved.id });
  }

  if (resolved.id === 'environmental' || resolved.id === 'sustainability' || resolved.id === 'esg') {
    _log('[ENVIRONMENTAL_AXIS_RESOLVED]', {
      user_id: safe.id,
      functional_axis: resolved.id,
      source: resolved.source,
      department: safe.department,
      job_title: safe.job_title
    });
  }

  _log('[FUNCTIONAL_AXIS_RESOLVED]', {
    user_id: safe.id,
    company_id: safe.company_id,
    functional_axis: resolved.id,
    functional_area: resolved.id,
    source: resolved.source,
    priority,
    environmental_guard: environmentalGuard,
    role: safe.role
  });

  const cadastroDeclaresQuality =
    catalog.normKey(safe.functional_area) === 'quality' ||
    catalog.normKey(safe.company_role_dashboard_hint) === 'quality' ||
    /(^|_)qualidade(_|$)|(^|_)quality(_|$)/.test(catalog.normKey(safe.job_title || '')) ||
    explicit?.id === 'quality';

  if (environmentalGuard && resolved.id === 'quality' && !cadastroDeclaresQuality) {
    _log('[QUALITY_AXIS_BLOCKED]', {
      user_id: safe.id,
      action: 'override_to_environmental',
      previous: 'quality'
    });
    resolved = { id: 'environmental', source: 'environmental_guard_override' };
  }

  return {
    functional_axis: resolved.id,
    functional_area: resolved.id,
    functional_area_label: catalog.getLabel(resolved.id),
    axis: catalog.getAxis(resolved.id),
    source: resolved.source,
    priority,
    environmental_guard: environmentalGuard,
    inference_trace: trace
  };
}

/** Compat: mesma assinatura que resolveFunctionalArea legado */
function resolveFunctionalArea(user) {
  return resolveFunctionalAxis(user).functional_area;
}

function getContextualModulesForAxis(functionalArea) {
  const id = catalog.normKey(functionalArea);
  const ENVIRONMENTAL_MODULES = [
    'environmental',
    'sustainability',
    'utilities',
    'waste_management',
    'environmental_compliance',
    'environmental_governance',
    'esg',
    'water_consumption',
    'energy_consumption',
    'environmental_incidents',
    'environmental_telemetry',
    'environmental_risks'
  ];
  if (['environmental', 'sustainability', 'esg', 'environmental_health_safety', 'utilities'].includes(id)) {
    return ENVIRONMENTAL_MODULES;
  }
  if (id === 'quality') {
    return ['quality', 'inspection', 'spc', 'governance', 'supplier'];
  }
  return [];
}

module.exports = {
  resolveFunctionalAxis,
  resolveFunctionalArea,
  getContextualModulesForAxis
};
