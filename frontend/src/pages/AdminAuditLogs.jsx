/**
 * LOGS DE AUDITORIA
 * Visualização de logs do sistema e acesso a dados (LGPD)
 */

import React, { useState, useEffect } from 'react';
import { FileText, Shield, Download, Filter, Search } from 'lucide-react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import { adminLogs } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './AdminAuditLogs.css';

export default function AdminAuditLogs() {
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState('audit');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });
  const [filters, setFilters] = useState({ search: '', severity: '', start_date: '', end_date: '' });

  useEffect(() => {
    loadLogs();
  }, [activeTab, pagination.offset]);

  useEffect(() => {
    adminLogs.getStats(7).then(r => setStats(r.data)).catch(() => {});
  }, []);

  const loadLogs = async () => {
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
          <button className={`tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}><FileText size={18} /> Auditoria</button>
          <button className={`tab ${activeTab === 'data-access' ? 'active' : ''}`} onClick={() => setActiveTab('data-access')}><Shield size={18} /> LGPD</button>
        </div>

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
      </div>
    </Layout>
  );
}
