/**
 * AIOI-P5.6 — Hook READ ONLY para decision visualization view model (P5.3)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createDecisionVisualizationCache,
  loadDecisionVisualizationViewModel,
  clearDecisionVisualizationCache
} from './decisionVisualizationViewModelLoader.js';
import { fetchDecisionVisualizationViewModel } from './decisionVisualizationGateway.js';

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
export function useDecisionVisualizationViewModel(companyId, options = {}) {
  const fetcher = options.fetcher || fetchDecisionVisualizationViewModel;
  const cacheRef = useRef(createDecisionVisualizationCache());
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
      const result = await loadDecisionVisualizationViewModel(
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
    clearDecisionVisualizationCache(cacheRef.current);
  }, []);

  return {
    ...state,
    reload,
    invalidateCache
  };
}

export default useDecisionVisualizationViewModel;
