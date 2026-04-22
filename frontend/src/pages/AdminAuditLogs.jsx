/**
 * LOGS DE AUDITORIA
 * Visualização de logs do sistema e acesso a dados (LGPD)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Shield, Filter, Search, Bot, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import DataLineageBlock from '../components/DataLineageBlock';
import { adminLogs, adminAiAudit } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './AdminAuditLogs.css';

function safePayloadPreview(payload) {
  try {
    const s = JSON.stringify(payload, null, 2);
    if (s.length > 20000) return `${s.slice(0, 20000)}\n… [truncado]`;
    return s;
  } catch {
    return String(payload ?? '');
  }
}

export default function AdminAuditLogs() {
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState('audit');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });
  const [filters, setFilters] = useState({ search: '', severity: '', start_date: '', end_date: '' });
  const [aiTraces, setAiTraces] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExpandId, setAiExpandId] = useState(null);

  const loadAiTraces = useCallback(async () => {
    try {
      setAiLoading(true);
      const res = await adminAiAudit.list({ limit: 100 });
      const items = res.data?.data?.items ?? res.data?.items ?? [];
      setAiTraces(Array.isArray(items) ? items : []);
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao carregar auditoria de IA');
      setAiTraces([]);
    } finally {
      setAiLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadLogs();
  }, [activeTab, pagination.offset]);

  useEffect(() => {
    adminLogs.getStats(7).then(r => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab !== 'ai-interactions') return;
    loadAiTraces();
  }, [activeTab, loadAiTraces]);

  const loadLogs = async () => {
    if (activeTab === 'ai-interactions') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params = { limit: pagination.limit, offset: pagination.offset, ...filters };
      const res = activeTab === 'audit' ? await adminLogs.getAuditLogs(params) : await adminLogs.getDataAccessLogs(params);
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const auditColumns = [
    { key: 'created_at', label: 'Data', render: v => v ? format(new Date(v), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-' },
    { key: 'user_name', label: 'Usuário', render: v => v || '-' },
    { key: 'action', label: 'Ação', render: v => <span className="action-badge">{v}</span> },
    { key: 'entity_type', label: 'Entidade', render: v => v || '-' },
    { key: 'severity', label: 'Severidade', render: v => <span className={`severity-badge severity-${v || 'info'}`}>{v || 'info'}</span> }
  ];

  const dataColumns = [
    { key: 'accessed_at', label: 'Data', render: v => v ? format(new Date(v), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-' },
    { key: 'user_name', label: 'Usuário', render: v => v || '-' },
    { key: 'accessed_user_name', label: 'Dados Acessados', render: (v, r) => v || r.entity_type || '-' },
    { key: 'entity_type', label: 'Tipo', render: v => v || '-' },
    { key: 'action', label: 'Ação', render: v => v || '-' }
  ];

  return (
    <Layout>
      <div className="admin-logs-page">
        <div className="page-header">
          <div className="header-left">
            <div className="page-icon"><FileText size={24} /></div>
            <div>
              <h1 className="page-title">Logs de Auditoria</h1>
              <p className="page-subtitle">Histórico de ações e acessos</p>
            </div>
          </div>
        </div>

        {stats?.summary && (
          <div className="stats-cards">
            <div className="stat-card"><span className="stat-value">{stats.summary.total_events || 0}</span><span className="stat-label">Eventos (7d)</span></div>
            <div className="stat-card"><span className="stat-value">{stats.summary.critical_events || 0}</span><span className="stat-label">Críticos</span></div>
            <div className="stat-card"><span className="stat-value">{stats.summary.last_24h || 0}</span><span className="stat-label">24h</span></div>
          </div>
        )}

        <div className="tabs">
          <button className={`tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => { setActiveTab('audit'); setAiExpandId(null); }}><FileText size={18} /> Auditoria</button>
          <button className={`tab ${activeTab === 'data-access' ? 'active' : ''}`} onClick={() => { setActiveTab('data-access'); setAiExpandId(null); }}><Shield size={18} /> LGPD</button>
          <button className={`tab ${activeTab === 'ai-interactions' ? 'active' : ''}`} onClick={() => setActiveTab('ai-interactions')}><Bot size={18} /> Interações IA</button>
        </div>

        {activeTab === 'ai-interactions' ? (
          <>
            <p className="admin-ai-audit-intro">
              Traces da caixa-preta (<code>ai_interaction_traces</code>): para cada interação, a secção abaixo mostra a{' '}
              <strong>linhagem de dados</strong> normalizada a partir de <code>input_payload.data_lineage</code> (entidade,
              origem técnica, frescura e fiabilidade), para auditoria e governança.
            </p>
            <div className="filters-bar admin-ai-audit-toolbar">
              <button type="button" className="btn btn-primary" onClick={loadAiTraces} disabled={aiLoading}>
                <RefreshCw size={18} className={aiLoading ? 'admin-ai-audit-spin' : ''} /> Atualizar lista
              </button>
              <span className="admin-ai-audit-toolbar__meta">Até 100 registos mais recentes da empresa</span>
            </div>
            {aiLoading && <p className="admin-ai-audit-loading">A carregar interações…</p>}
            {!aiLoading && aiTraces.length === 0 && (
              <p className="admin-ai-audit-empty">Nenhum trace de IA encontrado para esta empresa.</p>
            )}
            {!aiLoading && aiTraces.length > 0 && (
              <div className="admin-ai-audit-list">
                {aiTraces.map((row) => {
                  const open = aiExpandId === row.id;
                  const n = row.summary?.data_lineage_count ?? row.data_lineage?.length ?? 0;
                  const userLabel = row.user?.name || row.user?.email || '—';
                  return (
                    <div key={row.id} className={`admin-ai-audit-card ${open ? 'admin-ai-audit-card--open' : ''}`}>
                      <button
                        type="button"
                        className="admin-ai-audit-card__toggle"
                        onClick={() => setAiExpandId(open ? null : row.id)}
                        aria-expanded={open}
                      >
                        <span className="admin-ai-audit-card__chev">{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                        <span className="admin-ai-audit-card__main">
                          <span className="admin-ai-audit-card__line1">
                            <span className="admin-ai-audit-card__module">{row.module_name || '—'}</span>
                            <span className="admin-ai-audit-badge" data-empty={n === 0 ? '1' : undefined}>
                              {n === 0 ? 'Sem linhagem' : `${n} fonte${n !== 1 ? 's' : ''}`}
                            </span>
                          </span>
                          <span className="admin-ai-audit-card__line2">
                            <code className="admin-ai-audit-card__trace">{row.trace_id || '—'}</code>
                            <span className="admin-ai-audit-card__dot">·</span>
                            <span>{userLabel}</span>
                            <span className="admin-ai-audit-card__dot">·</span>
                            <span>
                              {row.created_at
                                ? format(new Date(row.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                                : '—'}
                            </span>
                          </span>
                          {Array.isArray(row.summary?.data_lineage_entities) && row.summary.data_lineage_entities.length > 0 && (
                            <span className="admin-ai-audit-card__preview" title="Primeiras entidades na linhagem">
                              {row.summary.data_lineage_entities.slice(0, 4).join(' · ')}
                            </span>
                          )}
                        </span>
                      </button>
                      {open && (
                        <div className="admin-ai-audit-card__detail">
                          {row.summary?.human_validation && (
                            <div className="admin-ai-audit-hitl">
                              <div className="admin-ai-audit-hitl__label">Validação humana</div>
                              <div className="admin-ai-audit-hitl__text">{row.summary.human_validation}</div>
                            </div>
                          )}
                          {Array.isArray(row.data_lineage) && row.data_lineage.length > 0 ? (
                            <DataLineageBlock
                              items={row.data_lineage}
                              variant="light"
                              showHint={false}
                              title="Linhagem de dados (input_payload)"
                            />
                          ) : (
                            <div className="admin-ai-audit-empty-lineage">
                              <strong>Nenhuma linhagem registada</strong> neste trace — o campo{' '}
                              <code>input_payload.data_lineage</code> está vazio ou ausente. Útil para detetar respostas sem
                              proveniência documentada.
                            </div>
                          )}
                          <details className="admin-ai-audit-payload">
                            <summary>Payload de entrada completo (JSON)</summary>
                            <pre className="admin-ai-audit-payload__pre">{safePayloadPreview(row.input_payload)}</pre>
                          </details>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="filters-bar">
              <div className="search-box"><Search size={18} /><input type="text" placeholder="Buscar" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} /></div>
              {activeTab === 'audit' && (
                <select value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}>
                  <option value="">Severidade</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              )}
              <input type="date" value={filters.start_date} onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))} />
              <input type="date" value={filters.end_date} onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))} />
              <button className="btn btn-primary" onClick={loadLogs}><Filter size={18} /> Filtrar</button>
            </div>

            <Table columns={activeTab === 'audit' ? auditColumns : dataColumns} data={logs} loading={loading} emptyMessage="Nenhum log" pagination={pagination} onPageChange={off => setPagination(p => ({ ...p, offset: off }))} />
          </>
        )}
      </div>
    </Layout>
  );
}
