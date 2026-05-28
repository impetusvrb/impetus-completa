/**
 * PROMPT 30 — Contexto global de locale / timezone / currency.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { enterpriseLocaleApi } from '../services/api';
import { setEnterpriseLocale, t as translate, formatLocalDateTime } from '../i18n/enterpriseI18n';

const EnterpriseLocaleContext = createContext(null);

export function EnterpriseLocaleProvider({ children }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('impetus_token');
    if (!token) {
      setContext(null);
      return;
    }
    setLoading(true);
    try {
      const res = await enterpriseLocaleApi.getContext();
      const ctx = res.data?.context;
      setContext(ctx || null);
      if (ctx?.locale) setEnterpriseLocale(ctx.locale);
    } catch {
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e) => {
      if (e.key === 'impetus_token') refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  const value = useMemo(
    () => ({
      context,
      loading,
      refresh,
      locale: context?.locale || 'pt-BR',
      timezone: context?.timezone || 'America/Sao_Paulo',
      currency: context?.currency || 'BRL',
      regionCode: context?.region_code || 'BR',
      t: (key, params) => translate(key, params),
      formatDateTime: (utc) =>
        formatLocalDateTime(utc, {
          timezone: context?.timezone,
          locale: context?.locale
        })
    }),
    [context, loading, refresh]
  );

  return (
    <EnterpriseLocaleContext.Provider value={value}>{children}</EnterpriseLocaleContext.Provider>
  );
}

export function useEnterpriseLocale() {
  const ctx = useContext(EnterpriseLocaleContext);
  if (!ctx) {
    return {
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      t: translate,
      formatDateTime: (utc) => formatLocalDateTime(utc),
      refresh: () => {},
      loading: false,
      context: null
    };
  }
  return ctx;
}
