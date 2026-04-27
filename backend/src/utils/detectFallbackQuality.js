'use strict';

/**
 * Heurística de resposta degradada / fallback para aprendizado estratégico (sem LLM).
 *
 * @param {null|undefined|{ answer?: string, degraded?: boolean }} synthesis
 * @returns {boolean}
 */
function detectFallbackQuality(synthesis) {
  if (!synthesis) {
    return false;
  }

  const text = String(synthesis.answer || '').toLowerCase();

  return (
    synthesis.degraded === true ||
    text.includes('não foi possível') ||
    text.includes('não tenho acesso') ||
    text.includes('verifique no sistema') ||
    text.length < 80
  );
}

module.exports = { detectFallbackQuality };
