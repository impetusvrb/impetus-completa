'use strict';

/**
 * Runtime State Classification — Enterprise Architectural Layer
 *
 * Define os 5 estágios formais de operação de qualquer módulo/feature do IMPETUS:
 *
 *   OBSERVABILITY → Apenas observa, mede, loga. Zero side effects no sistema.
 *   ENRICH        → Adiciona informação ao payload/contexto. Não decide, não executa.
 *   ASSISTIVE     → Sugere, recomenda, propõe. Requer confirmação humana para agir.
 *   EXECUTION     → Executa acções reais no sistema (DB writes, API calls, state changes).
 *   AUTHORITATIVE → Fonte de verdade que governa outros componentes. Máxima responsabilidade.
 *
 * Propriedades:
 *   - Cada módulo DEVE declarar o seu estágio
 *   - Transições de estágio são unidireccionais (escalação)
 *   - Só pode executar se explicitamente autorizado para EXECUTION ou AUTHORITATIVE
 *   - Flag: IMPETUS_RUNTIME_STATE_ENFORCEMENT=off|audit|enforce
 *
 * Additive-only: não altera nenhum comportamento existente quando enforcement=off.
 */

const STAGES = Object.freeze({
  OBSERVABILITY: 'observability',
  ENRICH: 'enrich',
  ASSISTIVE: 'assistive',
  EXECUTION: 'execution',
  AUTHORITATIVE: 'authoritative',
});

const STAGE_ORDER = Object.freeze({
  [STAGES.OBSERVABILITY]: 0,
  [STAGES.ENRICH]: 1,
  [STAGES.ASSISTIVE]: 2,
  [STAGES.EXECUTION]: 3,
  [STAGES.AUTHORITATIVE]: 4,
});

const SIDE_EFFECT_ALLOWED = Object.freeze(new Set([
  STAGES.EXECUTION,
  STAGES.AUTHORITATIVE,
]));

/**
 * Registry de módulos e seus estágios declarados.
 * Formato: { moduleId: { stage, description, owner, flags } }
 */
const MODULE_REGISTRY = new Map();

/**
 * Classificação dos módulos core do IMPETUS.
 * Cada entry define o estágio MÁXIMO permitido para o módulo.
 */
const CORE_CLASSIFICATIONS = Object.freeze({
  'dashboard.visibility': { stage: STAGES.AUTHORITATIVE, description: 'Source-of-truth para sections do dashboard' },
  'dashboard.chat': { stage: STAGES.EXECUTION, description: 'Chat IA — gera respostas, persiste mensagens' },
  'dashboard.panel_command': { stage: STAGES.EXECUTION, description: 'Smart Panel — gera conteúdo IA' },
  'dashboard.kpis': { stage: STAGES.ENRICH, description: 'Enriquece payload com KPIs — não decide' },
  'dashboard.layout': { stage: STAGES.ENRICH, description: 'Compõe layout — não executa acções' },
  'governance.shadow': { stage: STAGES.OBSERVABILITY, description: 'Comparação shadow — apenas observa divergências' },
  'governance.failsafe': { stage: STAGES.AUTHORITATIVE, description: 'Failsafe deny-first — governa fallback' },
  'governance.audit': { stage: STAGES.OBSERVABILITY, description: 'Audit trail — observa e persiste logs' },
  'governance.flags': { stage: STAGES.AUTHORITATIVE, description: 'Feature flags — governa activação' },
  'cognitive.envelope': { stage: STAGES.ENRICH, description: 'Cognitive envelope — enriquece contexto' },
  'cognitive.pulse': { stage: STAGES.ENRICH, description: 'Cognitive pulse — enriquece com estado operacional' },
  'cognitive.council': { stage: STAGES.EXECUTION, description: 'Cognitive council — executa decisões IA' },
  'engine_v2.composition': { stage: STAGES.ENRICH, description: 'Engine V2 — compõe widgets, não executa' },
  'engine_v2.gateway': { stage: STAGES.OBSERVABILITY, description: 'Engine V2 gateway — diff/shadow' },
  'runtime_z.sovereign': { stage: STAGES.ENRICH, description: 'Runtime Z — soberania contextual, enriquece' },
  'runtime_z.sz5': { stage: STAGES.ENRICH, description: 'SZ5 — memória conversacional, enriquece' },
  'manuia.diagnostics': { stage: STAGES.ASSISTIVE, description: 'ManuIA — sugere diagnósticos, requer confirmação' },
  'manuia.orders': { stage: STAGES.EXECUTION, description: 'ManuIA — cria ordens de serviço' },
  'integrations.edge_ingest': { stage: STAGES.EXECUTION, description: 'Edge ingest — persiste dados IoT' },
  'integrations.mes_erp': { stage: STAGES.EXECUTION, description: 'MES/ERP push — altera sistemas externos' },
  'proacao.create': { stage: STAGES.EXECUTION, description: 'Pró-Ação — cria propostas' },
  'proacao.evaluate': { stage: STAGES.ASSISTIVE, description: 'Pró-Ação — avaliação IA, sugere' },
  'admin.users': { stage: STAGES.EXECUTION, description: 'CRUD de usuários' },
  'admin.settings': { stage: STAGES.AUTHORITATIVE, description: 'Configurações da empresa — governa sistema' },
  'pulse.submit': { stage: STAGES.EXECUTION, description: 'Pulse — submete avaliação' },
  'pulse.trigger': { stage: STAGES.EXECUTION, description: 'Pulse HR — dispara ciclo' },
  'auth.login': { stage: STAGES.EXECUTION, description: 'Autenticação — cria sessão' },
  'lgpd.anonymize': { stage: STAGES.EXECUTION, description: 'LGPD — anonimiza dados (irreversível)' },
  'lgpd.delete': { stage: STAGES.EXECUTION, description: 'LGPD — delete account (irreversível)' },
});

function _getEnforcementMode() {
  const v = String(process.env.IMPETUS_RUNTIME_STATE_ENFORCEMENT || '').trim().toLowerCase();
  if (['enforce', 'audit'].includes(v)) return v;
  return 'off';
}

/**
 * Registra um módulo com seu estágio declarado.
 * @param {string} moduleId
 * @param {string} stage — um dos STAGES
 * @param {object} [meta] — { description, owner, flags }
 */
function registerModule(moduleId, stage, meta = {}) {
  if (!Object.values(STAGES).includes(stage)) {
    _log('invalid_stage_registration', { moduleId, stage, valid: Object.values(STAGES) });
    return false;
  }
  MODULE_REGISTRY.set(moduleId, { stage, ...meta, registered_at: new Date().toISOString() });
  return true;
}

/**
 * Verifica se um módulo está autorizado a executar side effects.
 *
 * @param {string} moduleId
 * @param {string} intendedAction — descrição da acção pretendida
 * @returns {{ allowed: boolean, reason: string, stage: string, enforcement: string }}
 */
function canExecute(moduleId, intendedAction = '') {
  const mode = _getEnforcementMode();
  const classification = CORE_CLASSIFICATIONS[moduleId] || MODULE_REGISTRY.get(moduleId);

  if (!classification) {
    const result = { allowed: true, reason: 'unclassified_module_allowed', stage: 'unknown', enforcement: mode };
    if (mode !== 'off') {
      _log('execution_attempt_unclassified', { moduleId, intendedAction, mode });
    }
    return result;
  }

  const stage = classification.stage;
  const allowed = SIDE_EFFECT_ALLOWED.has(stage);

  if (!allowed && mode !== 'off') {
    _log('execution_denied', {
      moduleId,
      stage,
      intendedAction,
      enforcement: mode,
      reason: `Module stage "${stage}" does not permit side effects`,
    });
  }

  if (!allowed && mode === 'enforce') {
    return { allowed: false, reason: `stage_${stage}_no_execution`, stage, enforcement: mode };
  }

  if (!allowed && mode === 'audit') {
    return { allowed: true, reason: `stage_${stage}_audit_only_pass`, stage, enforcement: mode };
  }

  return { allowed: true, reason: 'stage_permits_execution', stage, enforcement: mode };
}

/**
 * Verifica se uma escalação de estágio é válida.
 * Escalação: OBSERVABILITY → ENRICH → ASSISTIVE → EXECUTION → AUTHORITATIVE
 * Desescalação (ex: EXECUTION → OBSERVABILITY) é sempre negada.
 */
function canEscalate(moduleId, targetStage) {
  const classification = CORE_CLASSIFICATIONS[moduleId] || MODULE_REGISTRY.get(moduleId);
  if (!classification) return { allowed: true, reason: 'unclassified' };

  const currentOrder = STAGE_ORDER[classification.stage] ?? 0;
  const targetOrder = STAGE_ORDER[targetStage] ?? 0;

  if (targetOrder < currentOrder) {
    return { allowed: false, reason: 'deescalation_not_permitted', current: classification.stage, target: targetStage };
  }

  return { allowed: true, reason: 'escalation_valid', current: classification.stage, target: targetStage };
}

/**
 * Retorna o mapa completo de classificações para diagnóstico.
 */
function getClassificationMap() {
  const map = {};
  for (const [id, cls] of Object.entries(CORE_CLASSIFICATIONS)) {
    map[id] = { ...cls, source: 'core' };
  }
  for (const [id, data] of MODULE_REGISTRY.entries()) {
    map[id] = { ...data, source: 'dynamic' };
  }
  return map;
}

/**
 * Retorna estatísticas por estágio.
 */
function getStageStats() {
  const stats = { observability: 0, enrich: 0, assistive: 0, execution: 0, authoritative: 0 };
  for (const cls of Object.values(CORE_CLASSIFICATIONS)) {
    stats[cls.stage]++;
  }
  for (const [, data] of MODULE_REGISTRY.entries()) {
    stats[data.stage] = (stats[data.stage] || 0) + 1;
  }
  return {
    ...stats,
    total: Object.values(stats).reduce((a, b) => a + b, 0),
    enforcement_mode: _getEnforcementMode(),
  };
}

function _log(event, data) {
  try {
    console.info('[RUNTIME_STATE]', JSON.stringify({ _type: 'runtime_state_classification', event, ts: new Date().toISOString(), ...data }));
  } catch { /* never throw */ }
}

module.exports = {
  STAGES,
  STAGE_ORDER,
  SIDE_EFFECT_ALLOWED,
  CORE_CLASSIFICATIONS,
  registerModule,
  canExecute,
  canEscalate,
  getClassificationMap,
  getStageStats,
};
