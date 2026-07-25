export { logisticsCognitiveAdapter } from './logistics/index.js';
export { qualityCognitiveAdapter } from './quality/index.js';
export { safetyCognitiveAdapter } from './safety/index.js';
export { environmentCognitiveAdapter } from './environment/index.js';

import { logisticsCognitiveAdapter } from './logistics/index.js';
import { qualityCognitiveAdapter } from './quality/index.js';
import { safetyCognitiveAdapter } from './safety/index.js';
import { environmentCognitiveAdapter } from './environment/index.js';

/** Adapters CPL-002 registados (thin — delegação apenas). */
export const CPL_002_DOMAIN_ADAPTERS = Object.freeze([
  logisticsCognitiveAdapter,
  qualityCognitiveAdapter,
  safetyCognitiveAdapter,
  environmentCognitiveAdapter
]);
