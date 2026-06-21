'use strict';

/**
 * EVENT-GOVERNANCE-02 — contrato de validação de canal (sem execução).
 */

const { resolveChannelDefinition } = require('./channelRegistry');

/**
 * @param {object} params
 * @param {string} params.channel
 * @param {object} [params.registryEntry]
 * @returns {{ channel: string, available: boolean, supported: boolean, executor: string|null, validationPassed: boolean, aliasOf?: string|null }}
 */
function buildExecutionContract({ channel, registryEntry = null }) {
  const resolved = registryEntry
    ? { id: String(channel || ''), definition: registryEntry, aliasOf: null }
    : resolveChannelDefinition(channel);

  const id = resolved.id || String(channel || 'unknown');
  const definition = resolved.definition;
  const supported = definition != null;
  const available = supported && definition.available === true;
  const executor = supported ? definition.executor || null : null;
  const executorDefined = typeof executor === 'string' && executor.length > 0;
  const validationPassed = supported && available && executorDefined;

  const contract = {
    channel: id,
    available,
    supported,
    executor,
    validationPassed
  };

  if (resolved.aliasOf) {
    contract.aliasOf = resolved.aliasOf;
  }

  return Object.freeze(contract);
}

module.exports = {
  buildExecutionContract
};
