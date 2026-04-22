/**
 * INCIDENTES DE IA — painel enterprise de suporte / qualidade (tenant admin)
 */

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import DataLineageBlock from '../components/DataLineageBlock';
import { adminIncidents } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  RefreshCw,
  X,
  Activity,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import './AdminAiIncidents.css';

const TYPE_LABELS = {
  ALUCINACAO: 'Alucinação',
  DADO_INCORRETO: 'Dado incorreto',
  VIES: 'Viés',
  COMPORTAMENTO_INADEQUADO: 'Comportamento inadequado',
  UNKNOWN: 'Outro / genérico'
};

const STATUS_LABELS = {
  OPEN: 'Aberto',
  UNDER_ANALYSIS: 'Em análise',
  RESOLVED: 'Resolvido',
  FALSE_POSITIVE: 'Falso positivo'
};

function formatWeekLabel(w) {
  if (!w) return '—';
  try {
    return format(new Date(w), 'dd/MM', { locale: ptBR });
  } catch {
    return String(w);
  }
}

function safeJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export default function AdminAiIncidents() {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editStatus, setEditStatus] = useState('OPEN');
  const [editNote, setEditNote] = useState('');

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        adminIncidents.list({ limit: 200 }),
        adminIncidents.stats({ days: 90 })
      ]);
      setItems(listRes.data?.data?.items ?? listRes.data?.items ?? []);
      setStats(statsRes.data?.data ?? statsRes.data ?? null);
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao carregar incidentes');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openDetail = async (row) => {
    setDetail({ incident: row, trace_snapshot: null });
    setEditStatus(row.status);
    setEditNote(row.resolution_note || '');
    setDetailLoading(true);
    try {
      const res = await adminIncidents.get(row.id);
      const d = res.data?.data ?? res.data;
      setDetail({
        incident: d?.incident || row,
        trace_snapshot: d?.trace_snapshot || null
      });
      const inc = d?.incident || row;
      setEditStatus(inc.status);
      setEditNote(inc.resolution_note || '');
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao abrir detalhe');
    } finally {
      setDetailLoading(false);
    }
  };

  const saveDetail = async () => {
    if (!detail?.incident?.id) return;
    try {
      setSaving(true);
      await adminIncidents.update(detail.incident.id, {
        status: editStatus,
        resolution_note: editNote
      });
      notify.success('Incidente atualizado.');
      setDetail(null);
      loadAll();
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  };

  const chartData = (stats?.series || []).map((r) => ({
    ...r,
    weekLabel: formatWeekLabel(r.week)
  }));

  const summary = stats?.summary || { open: 0, under_analysis: 0, closed: 0, total: 0 };

  const lineageForDetail =
    detail?.trace_snapshot?.explanation_layer?.data_lineage?.length > 0
      ? detail.trace_snapshot.explanation_layer.data_lineage
      : detail?.trace_snapshot?.data_lineage;

  return (
    <Layout>
      <div className="admin-incidents-page">
        <div className="admin-incidents-header">
          <div className="admin-incidents-header__icon">
            <AlertTriangle size={26} />
          </div>
          <div>
            <h1 className="admin-incidents-title">Incidentes de IA</h1>
            <p className="admin-incidents-sub">
              Reportes conversacionais (alucinação, dados incorretos, viés) com vínculo à caixa-preta e linhagem.
            </p>
          </div>
          <button type="button" className="btn btn-primary admin-incidents-refresh" onClick={loadAll} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'admin-incidents-spin' : ''} /> Atualizar
          </button>
        </div>

        <div className="admin-incidents-kpis">
          <div className="admin-incidents-kpi admin-incidents-kpi--open">
            <Clock size={20} />
            <div>
              <div className="admin-incidents-kpi__val">{summary.open}</div>
              <div className="admin-incidents-kpi__lbl">Abertos</div>
            </div>
          </div>
          <div className="admin-incidents-kpi admin-incidents-kpi--analysis">
            <Activity size={20} />
            <div>
              <div className="admin-incidents-kpi__val">{summary.under_analysis}</div>
              <div className="admin-incidents-kpi__lbl">Em análise</div>
            </div>
          </div>
          <div className="admin-incidents-kpi admin-incidents-kpi--ok">
            <CheckCircle2 size={20} />
            <div>
              <div className="admin-incidents-kpi__val">{summary.closed}</div>
              <div className="admin-incidents-kpi__lbl">Encerrados</div>
            </div>
          </div>
          <div className="admin-incidents-kpi admin-incidents-kpi--total">
            <div>
              <div className="admin-incidents-kpi__val">{summary.total}</div>
              <div className="admin-incidents-kpi__lbl">Total (histórico)</div>
            </div>
          </div>
        </div>

        <div className="admin-incidents-chart-card">
          <h2 className="admin-incidents-h2">Saúde da IA — novos incidentes por semana (90 dias)</h2>
          <p className="admin-incidents-chart-hint">
            Tendência decrescente indica melhoria de qualidade após ajustes de modelo e dados.
          </p>
          {chartData.length === 0 && !loading ? (
            <p className="admin-incidents-empty-chart">Sem dados no período.</p>
          ) : (
            <div className="admin-incidents-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8
                    }}
                    labelFormatter={(_, p) => (p?.[0]?.payload?.week ? `Semana de ${formatWeekLabel(p[0].payload.week)}` : '')}
                  />
                  <Legend />
                  <Bar dataKey="created" name="Novos incidentes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="admin-incidents-table-card">
          <h2 className="admin-incidents-h2">Fila de reportes</h2>
          {loading ? (
            <p className="admin-incidents-loading">A carregar…</p>
          ) : items.length === 0 ? (
            <p className="admin-incidents-empty">Nenhum incidente registado.</p>
          ) : (
            <div className="admin-incidents-table-wrap">
              <table className="admin-incidents-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Severidade</th>
                    <th>Reportante</th>
                    <th>Trace</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.created_at
                          ? format(new Date(row.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '—'}
                      </td>
                      <td>
                        <span className="admin-incidents-type">{TYPE_LABELS[row.incident_type] || row.incident_type}</span>
                      </td>
                      <td>
                        <span className={`admin-incidents-status admin-incidents-status--${String(row.status || '').toLowerCase()}`}>
                          {STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>
                      <td>{row.severity}</td>
                      <td>{row.reporter?.name || row.reporter?.email || '—'}</td>
                      <td>
                        <code className="admin-incidents-trace">{String(row.trace_id || '').slice(0, 8)}…</code>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-incidents-row-btn"
                          onClick={() => openDetail(row)}
                        >
                          Detalhe <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {detail && (
        <div
          className="admin-incidents-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inc-detail-title"
          onClick={() => !saving && setDetail(null)}
        >
          <div className="admin-incidents-panel" onClick={(e) => e.stopPropagation()}>
            <div className="admin-incidents-panel__head">
              <h2 id="inc-detail-title">Incidente e rastreio</h2>
              <button type="button" className="admin-incidents-panel__close" onClick={() => setDetail(null)} aria-label="Fechar">
                <X size={22} />
              </button>
            </div>
            {detailLoading ? (
              <p>A carregar trace…</p>
            ) : (
              <div className="admin-incidents-panel__body">
                <div className="admin-incidents-detail-grid">
                  <div>
                    <div className="admin-incidents-dl-label">ID</div>
                    <code className="admin-incidents-mono">{detail.incident?.id}</code>
                  </div>
                  <div>
                    <div className="admin-incidents-dl-label">Trace (caixa-preta)</div>
                    <code className="admin-incidents-mono">{detail.incident?.trace_id}</code>
                  </div>
                  <div>
                    <div className="admin-incidents-dl-label">Módulo</div>
                    <div>{detail.trace_snapshot?.module_name || '—'}</div>
                  </div>
                  <div>
                    <div className="admin-incidents-dl-label">Tipo / severidade</div>
                    <div>
                      {TYPE_LABELS[detail.incident?.incident_type]} — {detail.incident?.severity}
                    </div>
                  </div>
                </div>

                <div className="admin-incidents-block">
                  <div className="admin-incidents-dl-label">Comentário do utilizador</div>
                  <div className="admin-incidents-comment">{detail.incident?.user_comment || '—'}</div>
                </div>

                <div className="admin-incidents-block">
                  <div className="admin-incidents-dl-label">Raciocínio da IA (explanation_layer no trace)</div>
                  {detail.trace_snapshot?.explanation_layer?.reasoning_trace ? (
                    <div className="admin-incidents-trace-text">
                      {detail.trace_snapshot.explanation_layer.reasoning_trace}
                    </div>
                  ) : (
                    <p className="admin-incidents-muted">Sem reasoning_trace no registo.</p>
                  )}
                </div>

                <div className="admin-incidents-block">
                  <DataLineageBlock
                    items={lineageForDetail}
                    variant="light"
                    showHint={false}
                    title="Linhagem de dados (trace)"
                  />
                  {(!lineageForDetail || lineageForDetail.length === 0) && (
                    <p className="admin-incidents-muted">Sem linhagem associada neste trace.</p>
                  )}
                </div>

                <details className="admin-incidents-json">
                  <summary>Payload técnico (input / output)</summary>
                  <pre className="admin-incidents-pre">{safeJson(detail.trace_snapshot?.input_payload)}</pre>
                  <pre className="admin-incidents-pre">{safeJson(detail.trace_snapshot?.output_response)}</pre>
                </details>

                <div className="admin-incidents-actions">
                  <label className="admin-incidents-field">
                    <span>Estado</span>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                      <option value="OPEN">Aberto</option>
                      <option value="UNDER_ANALYSIS">Em análise</option>
                      <option value="RESOLVED">Resolvido</option>
                      <option value="FALSE_POSITIVE">Falso positivo</option>
                    </select>
                  </label>
                  <label className="admin-incidents-field admin-incidents-field--grow">
                    <span>Nota de resolução</span>
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      rows={3}
                      placeholder="Ex.: Prompt ajustado; fonte KPI corrigida; validado com manutenção."
                    />
                  </label>
                  <div className="admin-incidents-actions__btns">
                    <button type="button" className="btn" onClick={() => setDetail(null)} disabled={saving}>
                      Cancelar
                    </button>
                    <button type="button" className="btn btn-primary" onClick={saveDetail} disabled={saving}>
                      {saving ? 'A guardar…' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
