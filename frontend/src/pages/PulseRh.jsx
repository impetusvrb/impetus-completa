/**
 * Impetus Pulse — visão RH (dados completos, disparo de ciclo, relatório IA).
 */
import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { pulse } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './PulseRh.css';

export default function PulseRh() {
  const notify = useNotification();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await pulse.hrListEvaluations({ from: from || undefined, to: to || undefined, limit: 300 });
      setRows(r.data?.evaluations || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar avaliações.');
    } finally {
      setLoading(false);
    }
  }, [from, to, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const triggerAll = async () => {
    try {
      const r = await pulse.hrTrigger({ all_eligible: true });
      notify.success(`Ciclo disparado: ${r.data?.created || 0} avaliação(ões) criada(s).`);
      load();
    } catch (e) {
      notify.error(e.apiMessage || e.message || 'Erro ao disparar.');
    }
  };

  const genReport = async (id) => {
    try {
      const r = await pulse.hrReport(id);
      const rep = r.data?.report;
      const blob = new Blob([JSON.stringify(rep, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pulse_diagnostico_${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success('Diagnóstico gerado (JSON). Exportação PDF pode ser acoplada ao visualizador.');
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao gerar relatório.');
    }
  };

  return (
    <Layout>
      <div className="pulse-rh-page">
        <header className="pulse-rh-page__head">
          <h1>Impetus Pulse — Inteligência humana</h1>
          <p className="pulse-rh-page__sub">
            Acesso completo (RH): respostas individuais, percepção do líder e disparo de ciclos. Supervisores não veem as
            notas dos subordinados — apenas o complemento cego.
          </p>
        </header>

        <div className="pulse-rh-toolbar">
          <label>
            De{' '}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="form-input" />
          </label>
          <label>
            Até{' '}
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="form-input" />
          </label>
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            Aplicar filtro
          </button>
          <button type="button" className="btn btn-primary" onClick={triggerAll}>
            Disparar ciclo (todos elegíveis)
          </button>
        </div>

        {loading ? (
          <p>Carregando…</p>
        ) : (
          <div className="pulse-rh-table-wrap">
            <table className="pulse-rh-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Status</th>
                  <th>Auto (4 eixos)</th>
                  <th>Percepção líder</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.user_name || '—'}</td>
                    <td>{row.status}</td>
                    <td>
                      <code className="pulse-rh-code">{JSON.stringify(row.fixed_scores || {})}</code>
                    </td>
                    <td>{row.supervisor_perception ? `${String(row.supervisor_perception).slice(0, 80)}…` : '—'}</td>
                    <td>
                      {row.status === 'completed' && (
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => genReport(row.id)}>
                          Diagnóstico IA (JSON)
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="pulse-rh-empty">Nenhum registro no período.</p>}
          </div>
        )}
      </div>
    </Layout>
  );
}
