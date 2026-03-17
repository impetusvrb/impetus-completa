/**
 * Widget Relatório IA — Prompt Parte 6 (Cérebro) + relatórios.
 * Resumo executivo ou consulta IA exibida no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { FileText } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-relatorio">
      <div className="cc-relatorio__header"><div className="cc-relatorio__sk" /></div>
      <div className="cc-relatorio__sk-line" /><div className="cc-relatorio__sk-line" /><div className="cc-relatorio__sk-line short" />
    </div>
  );
}

export default function WidgetRelatorioIA() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.getSmartSummary()
      .then((r) => {
        const s = r?.data?.summary ?? r?.data?.fallback ?? r?.data?.report;
        if (s) setText(typeof s === 'string' ? s : (s.text || s.content || s.report || ''));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-relatorio cc-widget--error">
        <div className="cc-relatorio__header"><FileText size={20} /> Relatório IA</div>
        <p className="cc-widget__empty">Relatório indisponível.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-relatorio">
      <div className="cc-relatorio__header">
        <FileText size={20} />
        <span>Relatório IA</span>
      </div>
      <div className="cc-relatorio__body">{text ? text.slice(0, 400) + (text.length > 400 ? '…' : '') : 'Nenhum relatório gerado para o período.'}</div>
    </div>
  );
}
