/**
 * AIOI-P5.8 — Hook READ ONLY para bundle consolidado de relatórios (P5.3)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createExecutiveReportsCache,
  loadExecutiveReportsBundle,
  clearExecutiveReportsCache
} from './executiveReportsViewModelLoader.js';
import { fetchExecutiveReportsBundle } from './executiveReportsGateway.js';

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
export function useExecutiveReportsViewModel(companyId, options = {}) {
  const fetcher = options.fetcher || fetchExecutiveReportsBundle;
  const cacheRef = useRef(createExecutiveReportsCache());
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
      const result = await loadExecutiveReportsBundle(
        companyId,
        cacheRef.current,
        fetcher
      );

      if (!result?.ok) {
        setState({
          status: 'error',
          bundle: null,
          error: result?.error || 'Falha ao carregar relatórios',
          readOnly: true
        });
        return;
      }

      setState({
        status: 'ready',
        bundle: result.bundle,
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
    clearExecutiveReportsCache(cacheRef.current);
  }, []);

  return {
    ...state,
    reload,
    invalidateCache
  };
}

export default useExecutiveReportsViewModel;
