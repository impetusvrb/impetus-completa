'use strict';

const DENIED = /ebitda|esg|rh|boardroom|turnover|faturamento/i;
const INDUSTRIAL = /gargalo|downtime|scrap|throughput|linha|máquina|sensor|parada|eficiencia/i;

function validateOperationalAiUsefulness(consolidated = {}, payload = {}) {
  const ai = consolidated.production_contextual_ai || payload.production_contextual_questions;
  const questions = Array.isArray(ai) ? ai : ai?.contextual_questions || [];
  const answers = ai?.answers || [];
  const blob = JSON.stringify({ questions, answers });
  return {
    industrial: INDUSTRIAL.test(blob) || questions.length >= 3,
    denied_topics_leak: DENIED.test(blob),
    question_count: questions.length,
    contextualized: answers.length > 0 || questions.length >= 5
  };
}

module.exports = { validateOperationalAiUsefulness };
