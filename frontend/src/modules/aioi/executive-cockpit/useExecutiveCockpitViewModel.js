/**
 * AIOI-P5.4 — Hook READ ONLY para bundle P5.3
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createCockpitViewModelCache,
  loadExecutiveViewModelBundle,
  clearCockpitViewModelCache
} from './executiveCockpitViewModelLoader.js';
import { fetchExecutiveViewModelBundle } from './executiveViewModelGateway.js';

const INITIAL_STATE = {
  status: 'idle',
  bundle: null,
  error: null,
  readOnly: true
};

/**
 * @param {string|null|undefined} companyId
 * @param {{ fetcher?: (companyId: string) => Promise<object> }} [options]
 */
export function useExecutiveCockpitViewModel(companyId, options = {}) {
  const fetcher = options.fetcher || fetchExecutiveViewModelBundle;
  const cacheRef = useRef(createCockpitViewModelCache());
  const [state, setState] = useState(INITIAL_STATE);

  const reload = useCallback(async () => {
    if (!companyId) {
      setState({ status: 'empty', bundle: null, error: null, readOnly: true });
      return;
    }

    setState((prev) => ({
      ...prev,
      status: 'loading',
      error: null,
      readOnly: true
    }));

    try {
      const result = await loadExecutiveViewModelBundle(
        companyId,
        cacheRef.current,
        fetcher
      );

      if (!result?.ok) {
        setState({
          status: 'error',
          bundle: null,
          error: result?.error || 'Falha ao carregar view model',
          readOnly: true
        });
        return;
      }

      setState({
        status: 'ready',
        bundle: result,
        error: null,
        readOnly: true
      });
    } catch (err) {
      setState({
        status: 'error',
        bundle: null,
        error: err?.message || 'Erro de rede',
        readOnly: true
      });
    }
  }, [companyId, fetcher]);

  useEffect(() => {
    reload();
  }, [reload]);

  const invalidateCache = useCallback(() => {
    clearCockpitViewModelCache(cacheRef.current);
  }, []);

  return {
    ...state,
    reload,
    invalidateCache
  };
}

export default useExecutiveCockpitViewModel;
