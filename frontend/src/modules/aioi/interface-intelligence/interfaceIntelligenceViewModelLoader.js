/**
 * AIOI-P5.7 — Cache e carregamento do view model Interface Intelligence (READ ONLY)
 */

export function createInterfaceIntelligenceCache() {
  return {
    viewModel: null,
    promise: null,
    companyId: null
  };
}

/**
 * @param {string} companyId
 * @param {ReturnType<createInterfaceIntelligenceCache>} cache
 * @param {(companyId: string) => Promise<object>} fetcher
 */
export async function loadInterfaceIntelligenceViewModel(companyId, cache, fetcher) {
  if (!companyId) {
    return { ok: false, error: 'companyId inválido' };
  }

  if (cache.companyId !== companyId) {
    cache.companyId = companyId;
    cache.viewModel = null;
    cache.promise = null;
  }

  if (cache.viewModel) {
    return cache.viewModel;
  }

  if (cache.promise) {
    return cache.promise;
  }

  cache.promise = Promise.resolve(fetcher(companyId))
    .then((result) => {
      cache.viewModel = result;
      cache.promise = null;
      return result;
    })
    .catch((err) => {
      cache.promise = null;
      throw err;
    });

  return cache.promise;
}

export function clearInterfaceIntelligenceCache(cache) {
  cache.viewModel = null;
  cache.promise = null;
  cache.companyId = null;
}
