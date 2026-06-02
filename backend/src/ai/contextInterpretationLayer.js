'use strict';

/**
 * Camada de Interpretação Contextual — IMPETUS
 * Transforma dados crus em significado operacional apto a guiar a IA.
 * Determinístico: mesma entrada → mesmo briefing_signature.
 * Sem efeitos colaterais.
 */

const { createHash } = require('crypto');

const EVENT_WINDOW = 30;

const COMMON_AVOID_PHRASES = [
  'operação parada',
  'produção descontinuada',
  'atrasos nas entregas',
  'perda de receita',
  'instabilidade da operação',
  'parada total',
  'operação totalmente parada',
  'produção completamente descontinuada',
  'impacto na receita',
  'insatisfação de clientes',
  'paralisação contínua',
  'deterioração',
  'inatividade da operação'
];

const DECISION_TABLE = {
  tenant_empty: {
    narrative_mode: 'no_data_consultative',
    buildBriefing: () =>
      'Esta organização ainda não possui máquinas cadastradas no sistema. ' +
      'Não há dados operacionais para análise. ' +
      'Oriente o utilizador para o cadastro de equipamentos e integração de fontes de dados.',
    must_avoid_phrases: [...COMMON_AVOID_PHRASES],
    must_propose_actions: [
      { id: 'open_machine_registration', label: 'Cadastrar máquinas', intent: 'open_wizard' },
      { id: 'open_dashboard_onboarding', label: 'Personalizar meu painel', intent: 'start_questionnaire' },
      { id: 'see_integration_guide', label: 'Como integrar PLC/MES', intent: 'show_doc' }
    ],
    confidence_floor: 0,
    confidence_ceiling: 30
  },

  tenant_inactive: {
    narrative_mode: 'config_diagnostic',
    buildBriefing: (coverage) =>
      `Esta organização possui ${coverage.machines_known} máquina(s) cadastrada(s), ` +
      'porém sem telemetria recente nas últimas 24h. ' +
      'Sem eventos registados na janela operacional. ' +
      'Oriente o utilizador para diagnóstico de conectividade (PLC/gateway) e verificação do estado das integrações.',
    must_avoid_phrases: [...COMMON_AVOID_PHRASES, 'eficiência operacional', 'queda de eficiência'],
    must_propose_actions: [
      { id: 'check_integrations', label: 'Verificar integrações', intent: 'open_integrations' },
      { id: 'open_machine_registration', label: 'Cadastrar mais máquinas', intent: 'open_wizard' }
    ],
    confidence_floor: 0,
    confidence_ceiling: 40
  },

  telemetry_only: {
    narrative_mode: 'telemetry_limited',
    buildBriefing: (coverage) => {
      const n = coverage.plc_equipment_count || 0;
      const ids =
        Array.isArray(coverage.active_equipment_ids) && coverage.active_equipment_ids.length
          ? coverage.active_equipment_ids
              .slice(0, 8)
              .map((e) => (typeof e === 'string' ? e : e.id || e.name))
              .filter(Boolean)
              .join(', ')
          : '—';
      return (
        'A empresa possui telemetria industrial ativa, porém não possui cadastro operacional completo ' +
        'de máquinas ou linhas de produção no MES. ' +
        `Foram detectados ${n} equipamento(s) com leitura PLC recente (ex.: ${ids}). ` +
        'Reconheça a telemetria existente. Não afirme ausência total de operação nem que o sistema está vazio. ' +
        'Não invente OEE, produção, volumes ou percentagens — explique que KPIs completos exigem cadastro MES e eventos de produção.'
      );
    },
    must_avoid_phrases: [
      ...COMMON_AVOID_PHRASES,
      'não existem dados operacionais',
      'não há dados operacionais',
      'sem dados operacionais',
      'sistema está vazio',
      'sistema vazio',
      'não existem máquinas cadastradas',
      'não há máquinas cadastradas',
      'informação indisponível para análise operacional'
    ],
    must_propose_actions: [
      { id: 'open_machine_registration', label: 'Completar cadastro de máquinas', intent: 'open_wizard' },
      { id: 'see_integration_guide', label: 'Como integrar PLC/MES', intent: 'show_doc' }
    ],
    confidence_floor: 25,
    confidence_ceiling: 55
  },

  production_paused: {
    narrative_mode: 'operational_attention',
    buildBriefing: (coverage) =>
      `${coverage.machines_known} máquina(s) com telemetria recente, ` +
      `mas sem eventos de produção nos últimos ${EVENT_WINDOW} minutos. ` +
      'Possível pausa operacional real ou janela entre turnos.',
    must_avoid_phrases: [],
    must_propose_actions: [],
    confidence_floor: 40,
    confidence_ceiling: 80
  },

  production_active: {
    narrative_mode: 'operational_status',
    buildBriefing: (coverage) => {
      const eventsCount = coverage.events_count || 0;
      const lastEvent = coverage.last_event_at || 'n/d';
      return (
        `Operação ativa: ${coverage.machines_with_recent_telemetry} máquina(s) com telemetria, ` +
        `${eventsCount} evento(s) na janela operacional. ` +
        `Último evento: ${lastEvent}.`
      );
    },
    must_avoid_phrases: [],
    must_propose_actions: [],
    confidence_floor: 50,
    confidence_ceiling: 100
  }
};

function md5(text) {
  return createHash('md5').update(text).digest('hex');
}

/**
 * @param {object} params
 * @param {object} params.user
 * @param {string} params.intent
 * @param {string} params.data_state - tenant_empty | tenant_inactive | telemetry_only | production_paused | production_active
 * @param {object} params.data_completeness
 * @param {object} params.coverage
 * @param {object} [params.session_context]
 * @returns {object} briefing interpretado
 */
function interpret({ user, intent, data_state, data_completeness, coverage, session_context }) {
  const rule = DECISION_TABLE[data_state];

  if (!rule) {
    const fallbackBriefing = `Estado de dados desconhecido: ${data_state}. Sem interpretação disponível.`;
    return {
      briefing: fallbackBriefing,
      briefing_signature: md5(fallbackBriefing),
      narrative_mode: 'unknown',
      must_avoid_phrases: [],
      must_propose_actions: [],
      confidence_floor: 0,
      confidence_ceiling: 0,
      briefing_schema_version: 'v1',
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    };
  }

  let briefing = rule.buildBriefing(coverage || {});

  const signature = md5(briefing);

  const fingerprints = session_context?.response_fingerprints;
  if (Array.isArray(fingerprints) && fingerprints.includes(signature)) {
    briefing +=
      ' [VARIAÇÃO REQUERIDA: responda com ângulo diferente das interações anteriores — foque em orientação prática.]';
  }

  return {
    briefing,
    briefing_signature: signature,
    narrative_mode: rule.narrative_mode,
    must_avoid_phrases: rule.must_avoid_phrases,
    must_propose_actions: rule.must_propose_actions,
    confidence_floor: rule.confidence_floor,
    confidence_ceiling: rule.confidence_ceiling,
    briefing_schema_version: 'v1',
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  };
}

/**
 * Entrada para rotas REST: deriva briefing determinístico a partir de metrics.data_state (operational_overview).
 * @param {object} [params]
 * @param {string|null|undefined} params.data_state
 * @param {object|null|undefined} params.metrics
 * @returns {object} interpret + campo data_state canónico
 */
function interpretContext({ data_state, metrics } = {}) {
  const fromMetrics = metrics && typeof metrics === 'object' ? metrics : {};
  const dsRaw =
    data_state != null && String(data_state).trim() !== ''
      ? String(data_state).trim()
      : fromMetrics.data_state != null
        ? String(fromMetrics.data_state).trim()
        : '';
  const ds = dsRaw && DECISION_TABLE[dsRaw] ? dsRaw : null;

  if (!ds) {
    const label = dsRaw || 'unknown';
    const fallbackBriefing = `Estado de dados: ${label}. Sem interpretação completa — assumir cautela e ausência de visibilidade operacional.`;
    return {
      data_state: label,
      briefing: fallbackBriefing,
      briefing_signature: md5(fallbackBriefing),
      narrative_mode: 'unknown',
      must_avoid_phrases: [],
      must_propose_actions: [],
      confidence_floor: 0,
      confidence_ceiling: 0,
      briefing_schema_version: 'v1',
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    };
  }

  const coverage = {
    machines_known:
      typeof fromMetrics.machines_count === 'number' ? fromMetrics.machines_count : 0,
    machines_with_recent_telemetry:
      typeof fromMetrics.machines_with_recent_telemetry === 'number'
        ? fromMetrics.machines_with_recent_telemetry
        : typeof fromMetrics.machines_count === 'number'
          ? fromMetrics.machines_count
          : 0,
    events_count:
      typeof fromMetrics.events_count === 'number' ? fromMetrics.events_count : 0,
    last_event_at: fromMetrics.last_event_at,
    plc_equipment_count:
      typeof fromMetrics.plc_equipment_count === 'number'
        ? fromMetrics.plc_equipment_count
        : fromMetrics.plc_grounding_summary?.equipment_count ?? 0,
    active_equipment_ids:
      fromMetrics.active_equipment_ids ||
      fromMetrics.plc_grounding_summary?.active_equipment_ids ||
      []
  };

  const interpreted = interpret({
    user: null,
    intent: 'operational_overview',
    data_state: ds,
    data_completeness: {},
    coverage,
    session_context: null
  });

  return {
    data_state: ds,
    ...interpreted
  };
}

module.exports = { interpret, interpretContext };
