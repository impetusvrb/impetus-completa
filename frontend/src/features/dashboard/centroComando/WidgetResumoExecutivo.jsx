/**
 * Widget Resumo Executivo — texto gerado (Prompt v3 Parte 6).
 * Exibido no grid; sem link para outro módulo.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { Sparkles } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-resumo">
      <div className="cc-resumo__header"><div className="cc-resumo__skeleton" /></div>
      <div className="cc-resumo__skeleton-line" />
      <div className="cc-resumo__skeleton-line" />
      <div className="cc-resumo__skeleton-line short" />
    </div>
  );
}

export default function WidgetResumoExecutivo() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.getSmartSummary()
      .then((r) => {
        const s = r?.data?.summary ?? r?.data?.fallback;
        if (s) setText(typeof s === 'string' ? s : (s.text || s.content || ''));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-resumo cc-widget--error">
        <div className="cc-resumo__header"><Sparkles size={20} /> Resumo</div>
        <p className="cc-widget__empty">Resumo indisponível no momento.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-resumo">
      <div className="cc-resumo__header">
        <Sparkles size={20} />
        <span>Resumo executivo</span>
      </div>
      <p className="cc-resumo__text">{text ? text.slice(0, 320) + (text.length > 320 ? '…' : '') : 'Nenhum resumo disponível para o período.'}</p>
    </div>
  );
}
