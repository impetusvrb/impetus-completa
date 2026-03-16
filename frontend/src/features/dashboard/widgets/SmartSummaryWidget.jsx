/**
 * Widget Resumo Inteligente - resumo diário/semanal gerado pela IA
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';
import { dashboard } from '../../../services/api';

export default function SmartSummaryWidget() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    dashboard.getSmartSummary()
      .then((r) => {
        if (cancelled) return;
        const s = r?.data?.summary ?? r?.data?.fallback;
        if (s) setSummary(typeof s === 'string' ? s : (s.text || s.content || ''));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="dashboard-widget dashboard-widget--summary">
      <div className="dashboard-widget__header">
        <h3 className="dashboard-widget__title"><Sparkles size={20} /> Resumo Inteligente</h3>
        <button type="button" className="dashboard-widget__action" onClick={() => navigate('/app/chatbot')}>
          Perguntar à IA <ChevronRight size={18} />
        </button>
      </div>
      {loading ? (
        <p className="dashboard-widget__loading">Gerando resumo...</p>
      ) : summary ? (
        <p className="dashboard-widget__summary-text">{(typeof summary === 'string' ? summary : '').slice(0, 280)}{(typeof summary === 'string' && summary.length > 280) ? '...' : ''}</p>
      ) : (
        <p className="dashboard-widget__empty">Use o Chat IA para obter um resumo personalizado.</p>
      )}
    </div>
  );
}
