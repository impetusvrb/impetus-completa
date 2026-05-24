'use strict';

const { enforceAssistiveOnly } = require('../config/sz2GovernanceFlags');

/**
 * Constrói um PreparedAction — descritor de acção pronto para ser revisto
 * e accionado por humano. Nunca executa.
 */
function buildPreparedAction({
  kind,
  title,
  description = '',
  inputs = {},
  expected_outputs = [],
  required_approvals = ['human_operator'],
  domain = null,
  tags = [],
  rationale = null
} = {}) {
  const base = {
    id: `prep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind,
    title,
    description,
    inputs,
    expected_outputs,
    required_approvals,
    domain,
    tags,
    rationale,
    status: 'prepared',
    prepared_at: new Date().toISOString()
  };
  return enforceAssistiveOnly(base);
}

module.exports = { buildPreparedAction };
