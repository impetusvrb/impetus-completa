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

module.exports = { IMPETUS_IA_GOVERNANCE_SYSTEM };
