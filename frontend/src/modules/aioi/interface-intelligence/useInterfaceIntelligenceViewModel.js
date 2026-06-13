/**
 * AIOI-P5.7 — Hook READ ONLY para interface intelligence view model (P5.3)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createInterfaceIntelligenceCache,
  loadInterfaceIntelligenceViewModel,
  clearInterfaceIntelligenceCache
} from './interfaceIntelligenceViewModelLoader.js';
import { fetchInterfaceIntelligenceViewModel } from './interfaceIntelligenceGateway.js';

const INITIAL_STATE = {
  status: 'idle',
  viewModel: null,
  error: null,
  readOnly: true
};

/**
 * @param {string|null|undefined} companyId
 * @param {{ fetcher?: (companyId: string) => Promise<object> }} [options]
 */
export function useInterfaceIntelligenceViewModel(companyId, options = {}) {
  const fetcher = options.fetcher || fetchInterfaceIntelligenceViewModel;
  const cacheRef = useRef(createInterfaceIntelligenceCache());
  const [state, setState] = useState(INITIAL_STATE);

  const reload = useCallback(async () => {
    if (!companyId) {
      setState({ status: 'empty', viewModel: null, error: null, readOnly: true });
      return;
    }

    setState((prev) => ({
      ...prev,
      status: 'loading',
      error: null,
      readOnly: true
    }));

    try {
      const result = await loadInterfaceIntelligenceViewModel(
        companyId,
        cacheRef.current,
        fetcher
      );

      if (!result?.ok) {
        setState({
          status: 'error',
          viewModel: null,
          error: result?.error || 'Falha ao carregar view model',
          readOnly: true
        });
        return;
      }

      setState({
        status: 'ready',
        viewModel: result.viewModel,
        error: null,
        readOnly: true
      });
    } catch (err) {
      setState({
        status: 'error',
        viewModel: null,
        error: err?.message || 'Erro de rede',
        readOnly: true
      });
    }
  }, [companyId, fetcher]);

  useEffect(() => {
    reload();
  }, [reload]);

  const invalidateCache = useCallback(() => {
    clearInterfaceIntelligenceCache(cacheRef.current);
  }, []);

  return {
    ...state,
    reload,
    invalidateCache
  };
}

export default useInterfaceIntelligenceViewModel;
