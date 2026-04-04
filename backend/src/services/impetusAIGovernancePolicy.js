'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Constituição normativa da Impetus IA (governança hierárquica, setor e função).
 * Texto em impetusAIGovernancePolicy.txt — injetar em system prompt ou início de prompts ao usuário.
 */
const IMPETUS_IA_GOVERNANCE_SYSTEM = fs.readFileSync(
  path.join(__dirname, 'impetusAIGovernancePolicy.txt'),
  'utf8'
);

/**
 * Protocolo de orquestração central (única interface, fluxo cognitivo, consolidação, sem atribuir fontes a “modelos”).
 * Texto em impetusCentralOrchestratorProtocol.txt
 */
const IMPETUS_IA_CENTRAL_ORCHESTRATOR_PROTOCOL = fs.readFileSync(
  path.join(__dirname, 'impetusCentralOrchestratorProtocol.txt'),
  'utf8'
);

const IMPETUS_IA_SYSTEM_PROMPT_FULL = `${IMPETUS_IA_GOVERNANCE_SYSTEM}\n\n---\n\n${IMPETUS_IA_CENTRAL_ORCHESTRATOR_PROTOCOL}`;

module.exports = {
  IMPETUS_IA_GOVERNANCE_SYSTEM,
  IMPETUS_IA_CENTRAL_ORCHESTRATOR_PROTOCOL,
  IMPETUS_IA_SYSTEM_PROMPT_FULL
};
