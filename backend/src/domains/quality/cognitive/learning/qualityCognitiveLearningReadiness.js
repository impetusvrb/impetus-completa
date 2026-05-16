'use strict';

const { buildCognitiveExplainability } = require('../explainability/qualityCognitiveExplainability');

/**
 * Avaliação de prontidão para aprendizagem futura (heurística; não treina modelos).
 */
function assessLearningReadiness(signals = {}) {
  const nProc = Array.isArray(signals.process_values) ? signals.process_values.length : 0;
  const nRec = Array.isArray(signals.recurrence_records) ? signals.recurrence_records.length : 0;
  const nSup = Array.isArray(signals.supplier_rows) ? signals.supplier_rows.length : 0;
  const diversity = [nProc > 20, nRec > 5, nSup > 3].filter(Boolean).length;
  const volume = Math.min(1, nProc / 200 + nRec / 40 + nSup / 30);
  const readiness = Math.max(0, Math.min(1, volume * 0.55 + (diversity / 3) * 0.45));
  return {
    ok: true,
    learning_readiness_index: readiness,
    data_diversity_score: diversity / 3,
    advisory_note:
      readiness < 0.35
        ? 'Volume/diversidade insuficientes para evolução cognitiva significativa — continuar colecta estruturada.'
        : 'Base aceitável para evolução incremental futura; revisitar após mais ciclos industriais.',
    explainability: buildCognitiveExplainability({
      rationale: 'Heurística linear sobre cardinalidade de sinais; não implica treino automático.',
      evidence: [`n_process=${nProc}`, `n_recurrence=${nRec}`, `n_supplier_rows=${nSup}`],
      confidence: 0.5,
      origin: 'quality_cognitive_learning_readiness'
    })
  };
}

module.exports = { assessLearningReadiness };
