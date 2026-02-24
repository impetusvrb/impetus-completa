/**
 * Hook para Resumo Inteligente no primeiro login do dia
 */
import { useState, useEffect, useCallback } from 'react';
import { dashboard } from '../../services/api';

const STORAGE_KEY = 'impetus_smartSummaryShown';
const STORAGE_DATE_KEY = 'impetus_smartSummaryDate';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function shouldShowSummary() {
  const lastShown = localStorage.getItem(STORAGE_DATE_KEY);
  const today = getTodayKey();
  return lastShown !== today;
}

function markSummaryShown() {
  localStorage.setItem(STORAGE_DATE_KEY, getTodayKey());
}

export function useSmartSummary(enabled = true) {
  const [summary, setSummary] = useState(null);
  const [periodo, setPeriodo] = useState('diário');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [alreadyShown, setAlreadyShown] = useState(false);

  const fetchAndShow = useCallback(async () => {
    if (!enabled || alreadyShown) return;
    if (!shouldShowSummary()) {
      setAlreadyShown(true);
      return;
    }

    setLoading(true);
    setShowModal(true);

    try {
      const r = await dashboard.getSmartSummary();
      if (r.data?.ok && r.data?.summary) {
        setSummary(r.data.summary);
        setPeriodo(r.data.periodo || 'diário');
      } else {
        setSummary(null);
      }
    } catch (e) {
      setSummary('*Resumo temporariamente indisponível.* Tente novamente em alguns minutos.');
    } finally {
      setLoading(false);
    }
  }, [enabled, alreadyShown]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    markSummaryShown();
    setAlreadyShown(true);
  }, []);

  return {
    summary,
    periodo,
    loading,
    showModal,
    fetchAndShow,
    closeModal
  };
}
