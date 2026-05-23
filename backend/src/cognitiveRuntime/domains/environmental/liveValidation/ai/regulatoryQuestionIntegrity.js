'use strict';

function validateRegulatoryQuestionIntegrity(questions = []) {
  const required = [/emiss|risco|resíduo|vencimento|conformidade|esg|auditoria/i];
  const hits = required.filter((r) => questions.some((q) => r.test(String(q)))).length;
  return { integrity_ok: hits >= 1 || questions.length >= 5, coverage: hits };
}

module.exports = { validateRegulatoryQuestionIntegrity };
