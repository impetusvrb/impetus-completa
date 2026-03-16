/**
 * Centro de Previsão – conforme prompt: seletor de período (tempo real, 7, 14, 30 dias, personalizado),
 * PredictionSettings = { mode, period }; ao mudar período recarrega; simular cenários; link centro completo.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, TrendingUp, Play } from 'lucide-react';
import { dashboard } from '../../../services/api';

const PERIODS = [
  { value: 'realtime', label: 'Tempo real' },
  { value: '7_days', label: '7 dias' },
  { value: '14_days', label: '14 dias' },
  { value: '30_days', label: '30 dias' },
  { value: 'custom', label: 'Personalizado' }
];

export default function PredictionCenterWidget({ label, defaultSettings = {} }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(defaultSettings.period || '14_days');
  const [metric] = useState(defaultSettings.metric || 'eficiencia');
  const [data, setData] = useState({ series: [], labels: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProjections = () => {
    setLoading(true);
    setError(null);
    dashboard.forecasting
      .getProjections(metric)
      .then((r) => {
        if (r?.data?.series) setData({ series: r.data.series, labels: r.data.labels || [] });
      })
      .catch((e) => setError(e?.response?.data?.error || 'Erro ao carregar projeções'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjections();
  }, [period, metric]);

  return (
    <div className="dashboard-widget dashboard-widget--prediction">
      <div className="dashboard-widget__header">
        <h3 className="dashboard-widget__title">{label || 'Centro de Previsão'}</h3>
        <button
          type="button"
          className="dashboard-widget__action"
          onClick={() => navigate('/app/centro-previsao-operacional')}
          aria-label="Abrir centro completo"
        >
          Abrir centro <ChevronRight size={18} />
        </button>
      </div>

      <div className="prediction-widget__period">
        <label className="prediction-widget__label">Período:</label>
        <select
          className="prediction-widget__select"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Selecionar período de previsão"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="dashboard-widget__loading">Carregando projeções...</p>
      ) : error ? (
        <p className="dashboard-widget__empty">{error}</p>
      ) : (data.series?.length > 0 || data.labels?.length > 0) ? (
        <div className="prediction-widget__chart">
          <div className="prediction-widget__mini-bars">
            {(data.series || []).slice(0, 6).map((v, i) => {
              const num = typeof v === 'number' ? v : parseFloat(v) || 0;
              const max = Math.max(...(data.series || [0]).map((x) => (typeof x === 'number' ? x : parseFloat(x) || 0)), 1);
              return (
                <div key={i} className="prediction-widget__bar-wrap">
                  <div className="prediction-widget__bar" style={{ height: `${(num / max) * 100}%` }} />
                  <span className="prediction-widget__bar-label">{data.labels?.[i] || `${num}%`}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="dashboard-widget__empty">Nenhuma projeção disponível. Abra o centro para configurar.</p>
      )}

      <div className="prediction-widget__actions">
        <button
          type="button"
          className="dashboard-widget__action prediction-widget__btn-simulate"
          onClick={() => navigate('/app/centro-previsao-operacional')}
        >
          <Play size={16} /> Simular cenários
        </button>
      </div>
    </div>
  );
}
