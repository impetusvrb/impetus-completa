'use strict';

function validateSustainabilitySemanticIntegrity(consolidated = {}) {
  const n = consolidated.environmental_narrative || {};
  const text = JSON.stringify(n);
  return {
    ok: !/marketing|greenwashing|sustainability report board/i.test(text),
    sustainability_focus: /resíduo|emiss|conformidade|licen/i.test(text) || consolidated.centers?.length > 0
  };
}

module.exports = { validateSustainabilitySemanticIntegrity };
