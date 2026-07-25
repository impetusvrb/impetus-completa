/**
 * CPL-002 — Bootstrap: regista adapters thin sem alterar domínios.
 */
import { registerCognitiveAdapter } from '../runtime/cognitiveAdapterRuntime.js';
import { CPL_002_DOMAIN_ADAPTERS } from '../adapters/index.js';

let _bootstrapped = false;

export function bootstrapCognitivePlatformAdapters() {
  if (_bootstrapped) return CPL_002_DOMAIN_ADAPTERS;
  for (const adapter of CPL_002_DOMAIN_ADAPTERS) {
    registerCognitiveAdapter(adapter);
  }
  _bootstrapped = true;
  return CPL_002_DOMAIN_ADAPTERS;
}

export function isCognitivePlatformBootstrapped() {
  return _bootstrapped;
}

export function resetBootstrapForTests() {
  _bootstrapped = false;
}
