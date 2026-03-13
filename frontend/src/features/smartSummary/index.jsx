/**
 * IMPETUS - Smart Summary Feature
 * Modal e hook para Resumo Inteligente (IA)
 */
import React, { useState, useCallback } from 'react';
import { dashboard } from '../../services/api';

export function useSmartSummary(autoShow = false) {
  const [showModal, setShowModal] = useState(false);
  const [summary, setSummary] = useState(null);
  const [periodo, setPeriodo] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAndShow = useCallback(async () => {
    setLoading(true);
    setShowModal(true);
    try {
      const r = await dashboard.getSmartSummary();
      if (r?.data?.ok) {
        setSummary(r.data.summary ?? r.data.fallback ?? 'Resumo indisponível no momento.');
        setPeriodo(r.data.periodo ?? '');
      } else {
        setSummary(r?.data?.fallback ?? 'Resumo temporariamente indisponível.');
      }
    } catch {
      setSummary('Não foi possível carregar o resumo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => setShowModal(false), []);

  return { showModal, summary, periodo, loading, fetchAndShow, closeModal };
}

export function SmartSummaryModal({ isOpen, onClose, summary, periodo, loading }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 12, padding: 24, maxWidth: 520, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <h3 style={{ margin: '0 0 16px' }}>Resumo Inteligente</h3>
        {periodo && <p style={{ color: '#64748b', margin: '0 0 12px', fontSize: 14 }}>{periodo}</p>}
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{summary}</div>
        )}
        <button type="button" onClick={onClose} style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
          Fechar
        </button>
      </div>
    </div>
  );
}
