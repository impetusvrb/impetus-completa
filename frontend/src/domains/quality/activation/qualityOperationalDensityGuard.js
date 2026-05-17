import { estimateNavigationPressure } from './qualityCognitiveNavigationPressure.js';
import { getCognitiveLoadSnapshot } from './qualityCognitiveLoadMonitor.js';

/**
 * Guarda densidade operacional — recomendações assistivas (não bloqueia por defeito).
 */
export function evaluateOperationalDensity(menuInjected, activeViews) {
  const nav = estimateNavigationPressure(menuInjected, activeViews);
  const cog = getCognitiveLoadSnapshot();
  const block_recommended = nav.risk === 'high' || cog.saturated;
  return { ...nav, cognitive: cog, block_recommended };
}
