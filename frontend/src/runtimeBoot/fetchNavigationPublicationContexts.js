/**
 * Contextos de navegação de domínio — carregamento escalonado (evita 4× paralelo).
 */
import { fetchQualityPublicationContext } from '../domains/quality/navigation/qualityDomainPublicationRuntime.js';
import { fetchSafetyPublicationContext } from '../domains/safety/navigation/safetyDomainPublicationRuntime.js';
import { fetchLogisticsPublicationContext } from '../domains/logistics/navigation/logisticsDomainPublicationRuntime.js';
import { fetchEnvironmentPublicationContext } from '../domains/environment/navigation/environmentDomainPublicationRuntime.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Busca os 4 contextos em duas sub-ondas (2+2) com pausa curta.
 * @returns {Promise<{quality,safety,logistics,environment}>}
 */
export async function fetchNavigationPublicationContextsStaggered() {
  const [quality, safety] = await Promise.all([
    fetchQualityPublicationContext(),
    fetchSafetyPublicationContext()
  ]);
  await sleep(120);
  const [logistics, environment] = await Promise.all([
    fetchLogisticsPublicationContext(),
    fetchEnvironmentPublicationContext()
  ]);
  return { quality, safety, logistics, environment };
}
