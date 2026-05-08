'use strict';

/**
 * Motor Adapter — adapta o Motor A (resolver textual) à mesma forma
 * normalizada do Motor B, para que o gateway possa comparar/decidir
 * sem que o frontend perceba diferenças.
 *
 * IMPORTANTE: este adapter NÃO altera o Motor A. Apenas chama os mesmos
 * services usados hoje por `routes/dashboard.js#GET /me` e re-empacota o
 * resultado na forma `NormalizedDashboard`.
 */

let _profileResolver = null;
let _accessService = null;
let _composer = null;
let _personalizadoService = null;

function _lazy() {
  if (!_profileResolver) _profileResolver = require('../../services/dashboardProfileResolver');
  if (!_accessService) _accessService = require('../../services/dashboardAccessService');
  if (!_composer) _composer = require('../../services/dashboardComposerService');
  if (!_personalizadoService) {
    try {
      _personalizadoService = require('../../services/dashboardPersonalizadoService');
    } catch (_) { /* opcional */ }
  }
  return {
    profileResolver: _profileResolver,
    accessService: _accessService,
    composer: _composer,
    personalizadoService: _personalizadoService
  };
}

/**
 * Versão SÍNCRONA do Motor A: usa só `getDashboardConfigForUser` +
 * `getAllowedModules`. Suficiente para a comparação shadow.
 *
 * (a versão completa, com KPIs reais, está em composeAsync abaixo)
 *
 * @param {object} user req.user
 * @returns {object} NormalizedDashboard
 */
function composeFromMotorASync(user) {
  const { profileResolver, accessService } = _lazy();
  const config = profileResolver.getDashboardConfigForUser(user || {});
  const profileConfig = config.profile_config || {};
  const cards = Array.isArray(profileConfig.cards) ? profileConfig.cards : [];
  const allowedCards = accessService.getAllowedCards(user || {}, cards) || [];
  const allowedModules = accessService.getAllowedModules(user || {}) || [];
  const moduleSet = new Set(allowedModules);
  const visibleModules = (profileConfig.visible_modules || []).filter((m) => moduleSet.has(m));

  const widgets = allowedCards.map((c, idx) => ({
    id: c.key || c.id || `card_${idx}`,
    posicao: idx + 1,
    tamanho: idx < 2 ? 'grande' : 'medio',
    prioridade: idx < 2 ? 'critica' : idx < 5 ? 'alta' : 'media',
    contexto: profileConfig.insights_mode || 'objective_practical',
    axes: [],          // Motor A não usa eixos — campo aditivo
    score: null,
    rationale: 'motor_A_legacy_card',
    capabilities_required: [],
    capabilities_ok: true
  }));

  const layout = widgets.map((w, i) => ({
    id: w.id,
    label: w.contexto || w.id,
    position: { row: Math.floor(i / 2), col: (i % 2) * 2, width: w.tamanho === 'grande' ? 2 : 1 },
    v2: null
  }));

  return {
    engine: 'A',
    trace_id: null,
    identity: {
      user_id: user?.id ?? null,
      company_id: user?.company_id ?? null,
      role_raw: user?.role ?? null,
      role_normalized: null,
      area: config.functional_area || null,
      function_type: null,
      hierarchy_level: user?.hierarchy_level ?? null,
      scope: null,
      axes_priority: [],
      primary_axis: null,
      capabilities: [],
      job_title_text: user?.job_title || null,
      department_text: user?.department || null,
      sources: {},
      rationale: [],
      trace: []
    },
    perfil: {
      cargo: user?.job_title || user?.role || 'colaborador',
      nivel: String(user?.hierarchy_level ?? '5'),
      departamento: user?.department || config.functional_area || 'geral',
      titulo_dashboard: profileConfig.label || config.profile_code,
      subtitulo: `legacy_profile=${config.profile_code}`,
      eixos_ativos: []
    },
    modulos: widgets.map((w) => ({
      id: w.id, posicao: w.posicao, tamanho: w.tamanho, prioridade: w.prioridade, contexto: w.contexto
    })),
    layout: { widgets: layout },
    layout_rules_version: 'a',
    assistente_ia: { especialidade: profileConfig.insights_mode || 'objective_practical', exemplos_perguntas: [], alertas_contextuais: [], mensagens_fallback: [] },
    personalization: {
      profile_code: config.profile_code,
      profile_label: profileConfig.label || config.profile_code,
      functional_area: config.functional_area || null,
      role: user?.role || null,
      hierarchy_level: user?.hierarchy_level ?? null,
      job_title: user?.job_title || null,
      department_name: user?.department || null,
      scope_level: null,
      primary_axis: null,
      axes_priority: [],
      capabilities: [],
      data_sufficiency: 'unknown',
      gaps: [],
      user_message: 'Resolução textual legado (Motor A).'
    },
    explainability: {
      trace_id: null,
      function_type: null,
      area: config.functional_area || null,
      area_source: 'profile_resolver',
      function_source: 'role_normalized',
      axes_priority: [],
      primary_axis: null,
      capabilities: [],
      capabilities_implicit: [],
      capabilities_from_permissions: Array.isArray(user?.permissions) ? user.permissions.slice() : [],
      widgets_selected: widgets.map((w) => ({ id: w.id, score: null, axes: [], rationale: w.rationale })),
      widgets_denied: cards.filter((c) => !allowedCards.includes(c)).map((c) => ({
        id: c.key || c.id || 'unknown',
        reason: 'sensitive_kpi_filter',
        capabilities_missing: ['view:financial|view:strategic']
      })),
      diagnostics: {
        profile_code: config.profile_code,
        visible_modules: visibleModules,
        allowed_modules: allowedModules,
        cards_total: cards.length,
        cards_allowed: allowedCards.length
      },
      identity_trace: [],
      rationale_human: `legacy_profile=${config.profile_code} (functional_area=${config.functional_area})`
    }
  };
}

/**
 * Versão ASSÍNCRONA: corresponde 1:1 ao que `routes/dashboard.js#/me` faz
 * hoje. Usa-se quando a flag está em `on` e o gateway precisa devolver o
 * payload completo do Motor A (com personalization de
 * `dashboardComposerService.buildDashboardPayload`).
 */
async function composeFromMotorAAsync(user) {
  const sync = composeFromMotorASync(user);
  try {
    const { composer } = _lazy();
    const payload = await composer.buildDashboardPayload(user || {});
    if (payload) {
      sync.personalization = {
        ...sync.personalization,
        ...payload,
        // payload.allowed_modules tem prioridade para o frontend
        allowed_modules: payload.allowed_modules || sync.explainability.diagnostics.allowed_modules
      };
    }
  } catch (err) {
    sync.explainability.diagnostics = sync.explainability.diagnostics || {};
    sync.explainability.diagnostics.composer_error = err && err.message ? err.message : String(err);
  }
  return sync;
}

module.exports = {
  composeFromMotorASync,
  composeFromMotorAAsync
};
