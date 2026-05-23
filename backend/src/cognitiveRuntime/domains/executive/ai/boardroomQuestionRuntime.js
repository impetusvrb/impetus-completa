'use strict';

const { STRATEGIC_QUESTIONS } = require('./executiveStrategicAi');

function resolveBoardroomQuestions() {
  return { questions: STRATEGIC_QUESTIONS, integrity_ok: STRATEGIC_QUESTIONS.length >= 7 };
}

module.exports = { resolveBoardroomQuestions };
