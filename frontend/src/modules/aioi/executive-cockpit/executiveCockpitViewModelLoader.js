/**
 * AIOI-P5.4 — Cache e carregamento do bundle P5.3 (READ ONLY · sem transformação)
 */

/**
 * @returns {{ bundle: object|null, promise: Promise|null, companyId: string|null }}
 */
export function createCockpitViewModelCache() {
  return {
    bundle: null,
    promise: null,
    companyId: null
  };
}

/**
 * Carrega getExecutiveViewModelBundle via fetcher injetável — passthrough sem transformação.
 *
 * @param {string} companyId
 * @param {ReturnType<createCockpitViewModelCache>} cache
 * @param {(companyId: string) => Promise<object>} fetcher
 */
export async function loadExecutiveViewModelBundle(companyId, cache, fetcher) {
  if (!companyId) {
    return { ok: false, error: 'companyId inválido' };
  }

  if (cache.companyId !== companyId) {
    cache.companyId = companyId;
    cache.bundle = null;
    cache.promise = null;
  }

  if (cache.bundle) {
    return cache.bundle;
  }

  if (cache.promise) {
    return cache.promise;
  }

  cache.promise = Promise.resolve(fetcher(companyId))
    .then((result) => {
      cache.bundle = result;
      cache.promise = null;
      return result;
    })
    .catch((err) => {
      cache.promise = null;
      throw err;
    });

  return cache.promise;
}

export function clearCockpitViewModelCache(cache) {
  cache.bundle = null;
  cache.promise = null;
  cache.companyId = null;
}
