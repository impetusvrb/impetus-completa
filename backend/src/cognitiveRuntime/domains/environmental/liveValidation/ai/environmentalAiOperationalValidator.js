'use strict';

const DENIED = /ebitda|oee|turnover|boardroom executivo|production_shift|faturamento documento/i;
const INDUSTRIAL = /emiss|resíduo|licen|compliance|esg|auditoria|risco regulat/i;

function validateEnvironmentalAiOperational(consolidated = {}, payload = {}) {
  const ai = consolidated.environmental_contextual_ai || payload.environmental_contextual_questions;
  const questions = Array.isArray(ai) ? ai : ai?.contextual_questions || [];
  const blob = JSON.stringify({ questions, ai });
  return {
    industrial: INDUSTRIAL.test(blob) || questions.length >= 5,
    denied_leak: DENIED.test(blob),
    question_count: questions.length,
    ok: !DENIED.test(blob) && questions.length >= 3
  };
}

module.exports = { validateEnvironmentalAiOperational };
