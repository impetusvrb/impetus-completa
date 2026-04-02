/**
 * Impetus Pulse — visão gestão (apenas agregados, sem respostas individuais).
 */
import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { pulse } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './PulseRh.css';

export default function PulseGestao() {
  const notify = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await pulse.mgmtAggregates({ from: from || undefined, to: to || undefined });
      setData(r.data?.aggregates || null);
    } catch (e) {
      notify.error(e.apiMessage || 'Sem acesso ou erro ao carregar agregados.');
    } finally {
      setLoading(false);
    }
  }, [from, to, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary || {};
  const chartData = [
    { name: 'Eficiência', v: Number(summary.avg_efficiency) || 0 },
    { name: 'Confiança', v: Number(summary.avg_confidence) || 0 },
    { name: 'Proatividade', v: Number(summary.avg_proactivity) || 0 },
    { name: 'Sinergia', v: Number(summary.avg_synergy) || 0 }
  ];

  return (
    <Layout>
      <div className="pulse-rh-page">
        <header className="pulse-rh-page__head">
          <h1>Impetus Pulse — Engajamento (visão coletiva)</h1>
          <p className="pulse-rh-page__sub">
            Médias agregadas por período. Detalhes individuais e respostas abertas permanecem restritos ao RH autorizado.
          </p>
        </header>

        <div className="pulse-rh-toolbar">
          <label>
            De <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="form-input" />
          </label>
          <label>
            Até <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="form-input" />
          </label>
          <button type="button" className="btn btn-primary" onClick={load} disabled={loading}>
            Atualizar
          </button>
        </div>

        {loading ? (
          <p>Carregando…</p>
        ) : (
          <>
            <p className="pulse-gestao-kpi">
              Amostras: <strong>{summary.n ?? 0}</strong> avaliações concluídas no filtro.
            </p>
            <div className="pulse-gestao-chart">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="v" name="Média (1-5)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <h2 className="pulse-gestao-h2">Por área / setor (sinergia e eficiência)</h2>
            <ul className="pulse-gestao-list">
              {(data?.by_department || []).map((d) => (
                <li key={d.department || '—'}>
                  <strong>{d.department || 'Sem setor'}</strong>: n={d.n}, eficiência média{' '}
                  {d.avg_efficiency != null ? Number(d.avg_efficiency).toFixed(2) : '—'}, sinergia{' '}
                  {d.avg_synergy != null ? Number(d.avg_synergy).toFixed(2) : '—'}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Layout>
  );
}
