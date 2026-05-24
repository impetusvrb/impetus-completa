'use strict';

const flags = require('../config/sz3FeatureFlags');
const vocab = require('./zOperationalVocabulary');

/**
 * Constrói uma narrativa operacional madura para o contexto actual.
 *
 * Usa templates do vocabulário + dados do SZ2 + padrão da biblioteca.
 * Produz linguagem industrial contextual — sem genéricos corporativos.
 */
function buildMatureNarrative({
  calibration = {},
  patternMatch = {},
  sz2CogOutput = {}
} = {}) {
  if (!flags.isLanguageEnabled()) {
    return { mature: false, narrative: sz2CogOutput?.narrative?.narrative || '' };
  }

  const sentences = [];

  // 1 — contexto herdado
  const inherited = sz2CogOutput?.continuity?.inherited_context;
  if (inherited) {
    sentences.push(
      vocab.getTemplate('context_inherited', { summary: (inherited.summary || '').slice(0, 80) })
    );
  }

  // 2 — padrão industrial identificado
  const top = patternMatch?.top;
  if (top) {
    sentences.push(top.language_template);
  } else if (!inherited) {
    sentences.push(vocab.getTemplate('no_pattern'));
  }

  // 3 — prioridade
  const tier = sz2CogOutput?.reasoning?.priority?.tier;
  if (tier && tier !== 'P4') {
    const tplKey = `priority_${tier.toLowerCase()}`;
    sentences.push(vocab.getTemplate(tplKey));
  }

  // 4 — criticidade
  const critLevel = sz2CogOutput?.reasoning?.criticality?.level;
  if (critLevel && ['critical', 'high'].includes(critLevel)) {
    sentences.push(vocab.getTemplate(`criticality_${critLevel}`));
  }

  // 5 — riscos
  const risks = sz2CogOutput?.reasoning?.detected_risks || [];
  if (risks.length >= 2) {
    sentences.push(vocab.getTemplate('risk_multi', { domains: risks.join(', ') }));
  } else if (risks.includes('safety')) {
    sentences.push(vocab.getTemplate('risk_safety'));
  } else if (risks.includes('environmental')) {
    sentences.push(vocab.getTemplate('risk_environmental'));
  }

  // 6 — acções preparadas
  const actionCount = sz2CogOutput?.actions?.count || 0;
  if (actionCount > 0) {
    sentences.push(vocab.getTemplate('action_prepared', { count: actionCount }));
  }

  // 7 — escalonamento
  const esc = sz2CogOutput?.reasoning?.escalation;
  if (esc?.suggested_escalation && esc.suggested_escalation !== 'self') {
    sentences.push(
      vocab.getTemplate('escalation_suggested', {
        role: esc.suggested_escalation.replace(/_/g, ' ')
      })
    );
  }

  // 8 — ruído: narrativa conservadora
  if (calibration?.suppress_enrichment) {
    sentences.length = 0;
    sentences.push(vocab.getTemplate('low_confidence'));
    if (inherited) sentences.push(vocab.getTemplate('context_inherited_short'));
  }

  // 9 — turno (sempre presente)
  const shift = sz2CogOutput?.context?.shift;
  const temporal = sz2CogOutput?.context?.temporal;
  if (shift?.shift_name && temporal?.part_of_day) {
    sentences.push(
      vocab.getTemplate('shift_context', {
        shift_name: shift.shift_name.replace('turno_', 'turno '),
        part_of_day: temporal.part_of_day
      })
    );
  }

  const narrative = sentences.join(' · ') || vocab.getTemplate('no_context');

  return {
    mature: true,
    narrative,
    sentences,
    pattern_id: top?.id || null,
    language_quality: Number(
      Math.min(1, 0.4 + sentences.length * 0.07 + (calibration?.overall_quality || 0) * 0.3).toFixed(3)
    )
  };
}

module.exports = { buildMatureNarrative };
