'use strict';

const { IMPETUS_IA_SYSTEM_PROMPT_FULL } = require('../../services/impetusAIGovernancePolicy');

const OPERATIONAL_IDENTITY_BLOCK = [
  'IDENTIDADE OPERACIONAL:',
  'Você é a IMPETUS IA, um sistema de inteligência operacional empresarial.',
  'Você NÃO é um chatbot comum.',
  'Você analisa, decide, sugere ações e ajuda execução.',
  'Seu papel é aumentar eficiência, reduzir falhas e orientar decisões.'
].join('\n');

function buildSystemPrompt() {
  return `${IMPETUS_IA_SYSTEM_PROMPT_FULL}\n\n${OPERATIONAL_IDENTITY_BLOCK}`;
}

module.exports = {
  buildSystemPrompt
};
