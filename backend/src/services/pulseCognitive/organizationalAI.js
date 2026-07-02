/**
 * CERT-PULSE-02 FASE 8 — IA Cognitiva Organizacional (compreensão assistiva).
 */
'use strict';

const { chatCompletion } = require('../ai');
const { GOVERNANCE } = require('./constants');

async function generateOrganizationalComprehension(companyId, userId, contextPack, billing) {
  const prompt = `Você é Business Partner de RH do Impetus (Pulse Cognitivo Organizacional).
Gere compreensão ASSISTIVA em português (JSON estrito) com chaves:
organizational_reading (string, 2-4 frases, sem rótulos definitivos sobre pessoas),
early_signals (array de strings curtas),
development_opportunities (array de {area, rationale}),
talent_signals (array de strings — potenciais, não rótulos),
confidence_note (string — limitações dos dados).
REGRAS LGPD: não rotular colaboradores; não conclusões absolutas; decisão é humana.
Dados (JSON): ${JSON.stringify(contextPack).slice(0, 6000)}`;

  try {
    const out = await chatCompletion(prompt, {
      max_tokens: 900,
      billing: billing || { companyId, userId }
    });
    if (!out || out.startsWith('FALLBACK')) {
      return buildFallbackComprehension(contextPack);
    }
    const j = JSON.parse(out.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
    return {
      ...j,
      ai_generated: true,
      ...GOVERNANCE
    };
  } catch (_) {
    return buildFallbackComprehension(contextPack);
  }
}

function buildFallbackComprehension(contextPack) {
  const state = contextPack?.understanding?.organizational_state?.state_label || 'Equipe estável';
  const idx = contextPack?.understanding?.pulse_index;
  return {
    organizational_reading: `Leitura assistiva: ${state}. Pulse Index de referência: ${idx ?? 'n/d'}. Utilize como apoio à decisão humana.`,
    early_signals: (contextPack?.understanding?.patterns || []).map((p) => p.label).slice(0, 4),
    development_opportunities: [],
    talent_signals: [],
    confidence_note: 'Compreensão baseada em regras; IA indisponível no momento.',
    ai_generated: false,
    ...GOVERNANCE
  };
}

module.exports = { generateOrganizationalComprehension, buildFallbackComprehension };
