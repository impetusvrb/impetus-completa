/**
 * Centro de Custos — Prompt Parte 4. Resumo executivo de custos + top perdas no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { DollarSign } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-custos">
      <div className="cc-custos__header"><div className="cc-custos__sk" /></div>
      <div className="cc-custos__sk-line" /><div className="cc-custos__sk-line short" />
    </div>
  );
}

export default function WidgetCentroCustos() {
  const [summary, setSummary] = useState('');
  const [topLoss, setTopLoss] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      dashboard.costs?.getExecutiveSummary?.().catch(() => ({ data: {} })),
      dashboard.costs?.getTopLoss?.().catch(() => ({ data: [] }))
    ])
      .then(([s, t]) => {
        const ex = s?.data?.summary ?? s?.data?.text ?? s?.data;
        setSummary(typeof ex === 'string' ? ex : (ex?.resumo ?? ''));
        const list = t?.data?.list ?? t?.data ?? [];
        setTopLoss(Array.isArray(list) ? list.slice(0, 4) : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-custos cc-widget--error">
        <div className="cc-custos__header"><DollarSign size={20} /> Centro de Custos</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-custos">
      <div className="cc-custos__header">
        <DollarSign size={20} />
        <span>Centro de Custos</span>
      </div>
      {summary && <p className="cc-custos__resumo">{summary.slice(0, 200)}{summary.length > 200 ? '…' : ''}</p>}
      {topLoss.length > 0 && (
        <ul className="cc-custos__list">
          {topLoss.map((item, i) => (
            <li key={i} className="cc-custos__item">
              <span className="cc-custos__label">{item.origin || item.name || item.label || '-'}</span>
              <span className="cc-custos__valor">{item.value ?? item.total ?? item.perda ?? 0}</span>
            </li>
          ))}
        </ul>
      )}
      {!summary && topLoss.length === 0 && <p className="cc-widget__empty">Nenhum dado de custos no período.</p>}
    </div>
  );
}
