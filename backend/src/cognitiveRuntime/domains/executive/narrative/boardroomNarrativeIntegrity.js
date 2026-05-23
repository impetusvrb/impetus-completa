'use strict';

const STRATEGIC = /enterprise|risco|maturidade|convergência|estabilidade|boardroom/i;
const FILLER = /lorem ipsum|resumo corporativo genérico|indicadores diversos/i;

function validateBoardroomNarrativeIntegrity(narrative = {}) {
  const text = JSON.stringify(narrative);
  return {
    ok: STRATEGIC.test(text) && !FILLER.test(text),
    enterprise_native: STRATEGIC.test(text),
    corporate_filler: FILLER.test(text)
  };
}

module.exports = { validateBoardroomNarrativeIntegrity };
