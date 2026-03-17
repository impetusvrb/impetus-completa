/**
 * Integração e Conectividade
 * Conectores MES/ERP e registro de Edge.
 */
import React, { useState, useEffect } from 'react';
import { Zap, Plus, Cpu, Server, AlertCircle, PlayCircle, History, Copy, Trash2 } from 'lucide-react';
import { integrations } from '../services/api';
import Layout from '../components/Layout';
import './AdminIntegrations.css';

const AUTH_TYPES = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'api_key', label: 'API Key' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'oauth2', label: 'OAuth2' }
];

const RECEIVE_MODES = [
  { value: 'webhook', label: 'Webhook (push)' },
  { value: 'scheduled', label: 'Agendado (pull)' }
];

export default function AdminIntegrations() {
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConnectorForm, setShowConnectorForm] = useState(false);
  const [connectorName, setConnectorName] = useState('');
  const [connectorEndpoint, setConnectorEndpoint] = useState('');
  const [receiveMode, setReceiveMode] = useState('webhook');
  const [scheduleCron, setScheduleCron] = useState('');
  const [authType, setAuthType] = useState('none');
  const [authHeaderName, setAuthHeaderName] = useState('X-API-Key');
  const [authApiKey, setAuthApiKey] = useState('');
  const [authBearer, setAuthBearer] = useState('');
  const [authBasicUser, setAuthBasicUser] = useState('');
  const [authBasicPass, setAuthBasicPass] = useState('');
  const [authOauthClientId, setAuthOauthClientId] = useState('');
  const [authOauthClientSecret, setAuthOauthClientSecret] = useState('');
  const [authOauthTokenUrl, setAuthOauthTokenUrl] = useState('');
  const [savingConnector, setSavingConnector] = useState(false);
  const [edgeId, setEdgeId] = useState('');
  const [edgeName, setEdgeName] = useState('');
  const [edgeSaving, setEdgeSaving] = useState(false);
  const [edgeResult, setEdgeResult] = useState(null);
  const [edgeAgents, setEdgeAgents] = useState([]);
  const [edgeLoading, setEdgeLoading] = useState(false);

  const [activeConnectorId, setActiveConnectorId] = useState(null);
  const [connectorLogs, setConnectorLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadConnectors = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await integrations.listConnectors();
      setConnectors(r?.data?.connectors ?? []);
    } catch (err) {
      setError(err?.apiMessage || err?.message || 'Erro ao carregar conectores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnectors();
    loadEdgeAgents();
  }, []);

  const loadEdgeAgents = async () => {
    setEdgeLoading(true);
    try {
      const r = await integrations.listEdgeAgents();
      setEdgeAgents(r?.data?.agents ?? []);
    } catch (err) {
      console.warn(err);
    } finally {
      setEdgeLoading(false);
    }
  };

  const buildAuthConfig = () => {
    if (authType === 'api_key') return { header_name: authHeaderName || 'X-API-Key', value: authApiKey || '' };
    if (authType === 'bearer') return { token: authBearer || '' };
    if (authType === 'basic') return { username: authBasicUser || '', password: authBasicPass || '' };
    if (authType === 'oauth2') return { client_id: authOauthClientId || '', client_secret: authOauthClientSecret || '', token_url: authOauthTokenUrl || '' };
    return {};
  };

  const handleCreateConnector = async (e) => {
    e.preventDefault();
    setSavingConnector(true);
    setError('');
    try {
      await integrations.createConnector({
        name: connectorName || 'MES/ERP',
        endpoint_url: connectorEndpoint || null,
        receive_mode: receiveMode,
        schedule_cron: receiveMode === 'scheduled' ? (scheduleCron || null) : null,
        auth_type: authType,
        auth_config: buildAuthConfig(),
        field_map: {},
        mapping_config: {}
      });
      setConnectorName('');
      setConnectorEndpoint('');
      setScheduleCron('');
      setAuthApiKey('');
      setAuthBearer('');
      setAuthBasicUser('');
      setAuthBasicPass('');
      setAuthOauthClientId('');
      setAuthOauthClientSecret('');
      setAuthOauthTokenUrl('');
      setShowConnectorForm(false);
      await loadConnectors();
    } catch (err) {
      setError(err?.apiMessage || err?.message || 'Erro ao criar conector.');
    } finally {
      setSavingConnector(false);
    }
  };

  const loadConnectorLogs = async (id) => {
    setLogsLoading(true);
    try {
      const r = await integrations.listConnectorLogs(id, 50);
      setConnectorLogs(r?.data?.logs ?? []);
    } catch {
      setConnectorLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTestConnector = async (id) => {
    try {
      await integrations.testConnector(id);
      await loadConnectors();
      if (activeConnectorId === id) await loadConnectorLogs(id);
    } catch (err) {
      setError(err?.apiMessage || err?.message || 'Falha no teste de conexão.');
    }
  };

  const handleRegisterEdge = async (e) => {
    e.preventDefault();
    if (!edgeId.trim()) return;
    setEdgeSaving(true);
    setError('');
    setEdgeResult(null);
    try {
      const r = await integrations.registerEdge({
        edge_id: edgeId.trim(),
        name: edgeName.trim() || edgeId.trim()
      });
      setEdgeResult(r?.data || { token: 'Registrado.', edge_id: edgeId.trim() });
      setEdgeId('');
      setEdgeName('');
      await loadEdgeAgents();
    } catch (err) {
      setError(err?.apiMessage || err?.message || 'Erro ao registrar edge.');
    } finally {
      setEdgeSaving(false);
    }
  };

  const copyToken = async (t) => {
    try { await navigator.clipboard.writeText(t); } catch {}
  };

  const revokeEdge = async (id) => {
    try {
      await integrations.revokeEdgeAgent(id);
      await loadEdgeAgents();
    } catch (err) {
      setError(err?.apiMessage || err?.message || 'Erro ao revogar token.');
    }
  };

  return (
    <Layout>
      <div className="admin-integrations">
        <header className="admin-integrations__header">
          <Zap size={28} className="admin-integrations__icon" />
          <h1 className="admin-integrations__title">Integração e Conectividade</h1>
        </header>
        <p className="admin-integrations__subtitle">
          Gerencie integrações com PLCs, ERPs e sistemas externos.
        </p>

        {error && (
          <div className="admin-integrations__error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="admin-integrations__grid">
          {/* Conectores MES/ERP */}
          <section className="admin-integrations__card">
            <div className="admin-integrations__card-header">
              <Server size={20} />
              <h2>Conectores MES/ERP</h2>
              <button
                type="button"
                className="admin-integrations__btn-add"
                onClick={() => setShowConnectorForm(!showConnectorForm)}
              >
                <Plus size={18} />
                Novo conector
              </button>
            </div>
            {showConnectorForm && (
              <form onSubmit={handleCreateConnector} className="admin-integrations__form">
                <input
                  type="text"
                  placeholder="Nome (ex: ERP Principal)"
                  value={connectorName}
                  onChange={(e) => setConnectorName(e.target.value)}
                  className="admin-integrations__input"
                />
                <input
                  type="url"
                  placeholder="URL do endpoint (obrigatório para pull/teste)"
                  value={connectorEndpoint}
                  onChange={(e) => setConnectorEndpoint(e.target.value)}
                  className="admin-integrations__input"
                />
                <div className="admin-integrations__row">
                  <select className="admin-integrations__input" value={receiveMode} onChange={(e) => setReceiveMode(e.target.value)}>
                    {RECEIVE_MODES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input
                    className="admin-integrations__input"
                    value={scheduleCron}
                    onChange={(e) => setScheduleCron(e.target.value)}
                    placeholder="Cron (ex: */5 * * * *)"
                    disabled={receiveMode !== 'scheduled'}
                  />
                </div>
                <select className="admin-integrations__input" value={authType} onChange={(e) => setAuthType(e.target.value)}>
                  {AUTH_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {authType === 'api_key' && (
                  <div className="admin-integrations__row">
                    <input className="admin-integrations__input" value={authHeaderName} onChange={(e) => setAuthHeaderName(e.target.value)} placeholder="Header name (ex: X-API-Key)" />
                    <input className="admin-integrations__input" value={authApiKey} onChange={(e) => setAuthApiKey(e.target.value)} placeholder="Valor da chave" />
                  </div>
                )}
                {authType === 'bearer' && (
                  <input className="admin-integrations__input" value={authBearer} onChange={(e) => setAuthBearer(e.target.value)} placeholder="Token" />
                )}
                {authType === 'basic' && (
                  <div className="admin-integrations__row">
                    <input className="admin-integrations__input" value={authBasicUser} onChange={(e) => setAuthBasicUser(e.target.value)} placeholder="Usuário" />
                    <input className="admin-integrations__input" value={authBasicPass} onChange={(e) => setAuthBasicPass(e.target.value)} placeholder="Senha" type="password" />
                  </div>
                )}
                {authType === 'oauth2' && (
                  <>
                    <div className="admin-integrations__row">
                      <input className="admin-integrations__input" value={authOauthClientId} onChange={(e) => setAuthOauthClientId(e.target.value)} placeholder="Client ID" />
                      <input className="admin-integrations__input" value={authOauthClientSecret} onChange={(e) => setAuthOauthClientSecret(e.target.value)} placeholder="Client Secret" type="password" />
                    </div>
                    <input className="admin-integrations__input" value={authOauthTokenUrl} onChange={(e) => setAuthOauthTokenUrl(e.target.value)} placeholder="Token URL" />
                  </>
                )}
                <div className="admin-integrations__form-actions">
                  <button type="button" onClick={() => setShowConnectorForm(false)} className="admin-integrations__btn secondary">
                    Cancelar
                  </button>
                  <button type="submit" disabled={savingConnector} className="admin-integrations__btn primary">
                    {savingConnector ? 'Salvando...' : 'Criar'}
                  </button>
                </div>
              </form>
            )}
            {loading ? (
              <p className="admin-integrations__muted">Carregando...</p>
            ) : connectors.length === 0 ? (
              <p className="admin-integrations__muted">Nenhum conector configurado. Adicione um para receber dados de MES/ERP via webhook.</p>
            ) : (
              <ul className="admin-integrations__list">
                {connectors.map((c) => (
                  <li key={c.id} className="admin-integrations__list-item">
                    <div className="admin-integrations__list-top">
                      <span className="admin-integrations__list-name">{c.name}</span>
                      <div className="admin-integrations__list-actions">
                        <button className="admin-integrations__icon-btn" type="button" title="Testar conexão agora" onClick={() => handleTestConnector(c.id)}>
                          <PlayCircle size={16} />
                        </button>
                        <button
                          className="admin-integrations__icon-btn"
                          type="button"
                          title="Histórico"
                          onClick={() => {
                            const next = activeConnectorId === c.id ? null : c.id;
                            setActiveConnectorId(next);
                            if (next) loadConnectorLogs(next);
                          }}
                        >
                          <History size={16} />
                        </button>
                      </div>
                    </div>
                    <span className="admin-integrations__list-meta">
                      {c.connector_type} • {c.enabled ? 'Ativo' : 'Inativo'} • {c.receive_mode || 'webhook'} • {c.last_status || 'pending'}
                    </span>
                    {c.endpoint_url && <span className="admin-integrations__list-url">{c.endpoint_url}</span>}
                    {activeConnectorId === c.id && (
                      <div className="admin-integrations__logs">
                        {logsLoading ? (
                          <p className="admin-integrations__muted">Carregando histórico...</p>
                        ) : connectorLogs.length === 0 ? (
                          <p className="admin-integrations__muted">Sem execuções registradas.</p>
                        ) : (
                          <div className="admin-integrations__logs-list">
                            {connectorLogs.map((l) => (
                              <div key={l.id} className="admin-integrations__log-row">
                                <span>{new Date(l.created_at).toLocaleString('pt-BR')}</span>
                                <span className={`admin-integrations__badge ${l.status}`}>{l.status}</span>
                                <span>{l.duration_ms ? `${l.duration_ms}ms` : '-'}</span>
                                <span className="admin-integrations__log-err">{l.error_message || ''}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Edge Agent */}
          <section className="admin-integrations__card">
            <div className="admin-integrations__card-header">
              <Cpu size={20} />
              <h2>Edge Agent</h2>
            </div>
            <p className="admin-integrations__muted admin-integrations__muted--block">
              Registre um agente edge para enviar leituras de PLC/sensores. Após o registro, use o token nas requisições de ingest.
            </p>
            <form onSubmit={handleRegisterEdge} className="admin-integrations__form">
              <input
                type="text"
                placeholder="ID do edge (obrigatório)"
                value={edgeId}
                onChange={(e) => setEdgeId(e.target.value)}
                className="admin-integrations__input"
                required
              />
              <input
                type="text"
                placeholder="Nome (opcional)"
                value={edgeName}
                onChange={(e) => setEdgeName(e.target.value)}
                className="admin-integrations__input"
              />
              <button type="submit" disabled={edgeSaving || !edgeId.trim()} className="admin-integrations__btn primary">
                {edgeSaving ? 'Registrando...' : 'Registrar edge'}
              </button>
            </form>
            {edgeResult && (
              <div className="admin-integrations__edge-result">
                <p><strong>Edge registrado.</strong></p>
                {edgeResult.token && (
                  <p className="admin-integrations__token">
                    Token (mostrado uma vez): <code>{edgeResult.token}</code>
                    <button className="admin-integrations__icon-btn" type="button" title="Copiar" onClick={() => copyToken(edgeResult.token)}>
                      <Copy size={14} />
                    </button>
                  </p>
                )}
                <p className="admin-integrations__muted">Guarde o token em local seguro; ele será usado no agente edge.</p>
              </div>
            )}

            <div className="admin-integrations__edge-agents">
              <div className="admin-integrations__edge-agents-header">
                <h3>Agents registrados</h3>
                {edgeLoading && <span className="admin-integrations__muted">atualizando...</span>}
              </div>
              {edgeAgents.length === 0 ? (
                <p className="admin-integrations__muted">Nenhum agent registrado.</p>
              ) : (
                <div className="admin-integrations__edge-list">
                  {edgeAgents.map((a) => (
                    <div key={a.id} className="admin-integrations__edge-row">
                      <div className="admin-integrations__edge-main">
                        <div><strong>{a.edge_id}</strong> {a.name ? <span className="admin-integrations__muted">({a.name})</span> : null}</div>
                        <div className="admin-integrations__muted">
                          Último acesso: {a.last_seen_at ? new Date(a.last_seen_at).toLocaleString('pt-BR') : 'nunca'} • {a.status || 'offline'} • {a.enabled ? 'ativo' : 'revogado'}
                        </div>
                      </div>
                      <button className="admin-integrations__icon-btn danger" type="button" title="Revogar token" onClick={() => revokeEdge(a.id)} disabled={!a.enabled}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
