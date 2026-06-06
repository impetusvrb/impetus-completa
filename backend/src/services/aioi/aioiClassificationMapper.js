'use strict';

/**
 * AIOI-P0.3 — Mapper de classificação do IOE
 *
 * Responsabilidade: determinar a classificação final de um IOE
 * a partir de metadados já persistidos (category, source_type, priority_band).
 *
 * REGRAS ABSOLUTAS:
 *   ✓ Sem IA / LLM / embeddings / aprendizado
 *   ✓ Sem recálculo de prioridade (Contrato P-01/P-02)
 *   ✓ Sem recálculo de Truth
 *   ✓ Apenas metadados já presentes no IOE/outbox
 *   ✓ Mapeamento determinístico e auditável
 *
 * ANTI_DUPLICATION_POLICY.md §2–§6:
 *   O consumer apenas consome dados já persistidos; nenhum soberano é chamado aqui.
 */

const LAYER = 'AIOI_CLASSIFICATION_MAPPER';

// ---------------------------------------------------------------------------
// Categorias válidas (espelham migration P0.1 CHECK constraint)
// ---------------------------------------------------------------------------
const VALID_CATEGORIES = new Set([
  'equipment_failure',
  'equipment_degradation',
  'production_deviation',
  'quality_issue',
  'safety_incident',
  'maintenance_required',
  'communication_risk',
  'task_overdue',
  'environmental_alert',
  'kpi_deviation',
  'system_event'
]);

// ---------------------------------------------------------------------------
// Mapeamento source_type → category padrão (fallback quando category ausente)
// Mapeamento estático, sem inferência.
// ---------------------------------------------------------------------------
const SOURCE_TYPE_DEFAULT_CATEGORY = {
  plc_telemetry:        'system_event',
  plc_pattern:          'equipment_degradation',
  plc_event:            'equipment_degradation',
  communication:        'communication_risk',
  work_order:           'maintenance_required',
  task:                 'task_overdue',
  mes_erp:              'kpi_deviation',
  quality_nc:           'quality_issue',
  safety_event:         'safety_incident',
  environmental:        'environmental_alert',
  manual:               'system_event',
  cognitive_ingestion:  'system_event'
};

// ---------------------------------------------------------------------------
// Urgência de classificação por priority_band
// Determina se o IOE deve ser escalado ou apenas triaged.
// ---------------------------------------------------------------------------
const PRIORITY_BAND_TO_URGENCY = {
  critical: 'high_urgency',
  high:     'high_urgency',
  medium:   'normal',
  low:      'normal'
};

// ---------------------------------------------------------------------------
// Mapeamento completo de classificação
// ---------------------------------------------------------------------------

/**
 * Resolve a category final do IOE.
 * Prioridade: category persistida → fallback por source_type → 'system_event'.
 *
 * @param {string} category
 * @param {string} sourceType
 * @returns {string}
 */
function resolveCategory(category, sourceType) {
  if (category && VALID_CATEGORIES.has(category)) {
    return category;
  }
  const fallback = SOURCE_TYPE_DEFAULT_CATEGORY[sourceType];
  if (fallback) {
    console.warn(`[${LAYER}] category inválida ou ausente ('${category}') para source_type='${sourceType}'; usando fallback='${fallback}'`);
    return fallback;
  }
  return 'system_event';
}

/**
 * Classifica um IOE com base em seus metadados persistidos.
 * Retorna o resultado da classificação sem efetuar nenhum cálculo soberano.
 *
 * @param {object} ioe — linha de industrial_operational_events
 * @returns {{
 *   resolved_category: string,
 *   urgency: string,
 *   classification_confidence: number,
 *   classification_basis: string,
 *   is_high_urgency: boolean
 * }}
 */
function classifyIoe(ioe) {
  if (!ioe || typeof ioe !== 'object') {
    throw new Error(`${LAYER}: ioe inválido ou ausente`);
  }

  const resolvedCategory = resolveCategory(ioe.category, ioe.source_type);
  const urgency = PRIORITY_BAND_TO_URGENCY[ioe.priority_band] || 'normal';

  // Confiança de classificação:
  // - Alta (90) quando category persistida é válida
  // - Média (60) quando usou fallback de source_type
  // - Baixa (30) quando usou 'system_event' como default final
  let classificationConfidence;
  let classificationBasis;

  if (ioe.category && VALID_CATEGORIES.has(ioe.category)) {
    classificationConfidence = 90;
    classificationBasis = 'category_from_adapter';
  } else if (SOURCE_TYPE_DEFAULT_CATEGORY[ioe.source_type]) {
    classificationConfidence = 60;
    classificationBasis = 'fallback_source_type';
  } else {
    classificationConfidence = 30;
    classificationBasis = 'default_system_event';
  }

  // Boost de confiança quando priority_score é alto (dado concreto)
  const priorityScore = Number(ioe.priority_score) || 0;
  if (priorityScore >= 70) {
    classificationConfidence = Math.min(99, classificationConfidence + 5);
  }

  return {
    resolved_category:        resolvedCategory,
    urgency,
    classification_confidence: classificationConfidence,
    classification_basis:      classificationBasis,
    is_high_urgency:           urgency === 'high_urgency'
  };
}

/**
 * Verifica se um IOE já foi classificado (evitar reprocessamento).
 *
 * @param {object} ioe
 * @returns {boolean}
 */
function isAlreadyClassified(ioe) {
  return ioe && ioe.status !== 'open';
}

module.exports = {
  classifyIoe,
  resolveCategory,
  isAlreadyClassified,
  VALID_CATEGORIES,
  SOURCE_TYPE_DEFAULT_CATEGORY
};
