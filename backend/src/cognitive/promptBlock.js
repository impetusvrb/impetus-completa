'use strict';

/**
 * Helper de prompt: formata o snapshot cognitivo (overlay event-pipeline)
 * num bloco textual injectável depois do user input.
 *
 * Formato actual (soft, alinhado ao spec): a IA é instruída a tratar isto como
 * um sinal de apoio, NÃO como fonte de verdade. O bloco anterior
 * "COGNITIVE ANALYSIS:" foi substituído por "[Possible semantic interpretation
 * — event pipeline overlay]" para não induzir over-trust no modelo.
 *
 * Saída exemplo:
 *
 *   [Possible semantic interpretation — event pipeline overlay]
 *   - Possible intent: analysis (confidence: 0.82)
 *   - Context summary: Pedido para …
 *   - Extracted entities: XPTO-12, BOMBA-01
 *
 *   Use this as a supporting signal, not a source of truth.
 *
 * Quando `cognitive` é falsy, devolve string vazia (callers fazem `${block}`).
 */

/**
 * @param {object|null|undefined} cognitive — snapshot vindo de cognitiveAttachment
 * @returns {string}
 */
function formatCognitiveBlock(cognitive) {
  if (!cognitive || typeof cognitive !== 'object') return '';

  const intent = cognitive.intent != null && cognitive.intent !== '' ? String(cognitive.intent) : null;
  const summary = cognitive.summary != null && cognitive.summary !== '' ? String(cognitive.summary) : null;
  const entitiesArr = Array.isArray(cognitive.entities) ? cognitive.entities : [];
  const confidence =
    typeof cognitive.confidence === 'number' && Number.isFinite(cognitive.confidence)
      ? cognitive.confidence
      : null;

  if (!intent && !summary && entitiesArr.length === 0 && confidence == null) return '';

  const entitiesStr =
    Array.isArray(entitiesArr) && entitiesArr.length > 0
      ? entitiesArr
          .map((e) => (typeof e === 'string' ? e : e == null ? '' : String(e)))
          .filter((e) => e.length > 0)
          .join(', ') || 'none detected'
      : 'none detected';

  return [
    '[Possible semantic interpretation — event pipeline overlay]',
    `- Possible intent: ${intent ?? 'unknown'} (confidence: ${confidence ?? 'unknown'})`,
    `- Context summary: ${summary ?? 'unavailable'}`,
    `- Extracted entities: ${entitiesStr}`,
    '',
    'Use this as a supporting signal, not a source of truth.'
  ].join('\n');
}

module.exports = { formatCognitiveBlock };
