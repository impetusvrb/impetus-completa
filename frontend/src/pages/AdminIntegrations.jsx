/**
 * Integração e Conectividade
 * Conectores MES/ERP e registro de Edge.
 */
import React, { useState, useEffect } from 'react';
import { Zap, Plus, Cpu, Server, AlertCircle } from 'lucide-react';
import { integrations } from '../services/api';
import Layout from '../components/Layout';
import './AdminIntegrations.css';

export default function AdminIntegrations() {
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConnectorForm, setShowConnectorForm] = useState(false);
  const [connectorName, setConnectorName] = useState('');
  const [connectorEndpoint, setConnectorEndpoint] = useState('');
  const [savingConnector, setSavingConnector] = useState(false);
  const [edgeId, setEdgeId] = useState('');
  const [edgeName, setEdgeName] = useState('');
  const [edgeSaving, setEdgeSaving] = useState(false);
  const [edgeResult, setEdgeResult] = useState(null);

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
  }, []);

  const handleCreateConnector = async (e) => {
    e.preventDefault();
    setSavingConnector(true);
    setError('');
    try {
      await integrations.createConnector({
        name: connectorName || 'MES/ERP',
        endpoint_url: connectorEndpoint || null,
        auth_type: 'api_key',
        auth_config: {},
        mapping_config: {}
      });
      setConnectorName('');
      setConnectorEndpoint('');
      setShowConnectorForm(false);
      await loadConnectors();
    } catch (err) {
      setError(err?.apiMessage || err?.message || 'Erro ao criar conector.');
    } finally {
      setSavingConnector(false);
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
    } catch (err) {
      setError(err?.apiMessage || err?.message || 'Erro ao registrar edge.');
    } finally {
      setEdgeSaving(false);
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
                  placeholder="URL do endpoint (opcional)"
                  value={connectorEndpoint}
                  onChange={(e) => setConnectorEndpoint(e.target.value)}
                  className="admin-integrations__input"
                />
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
                    <span className="admin-integrations__list-name">{c.name}</span>
                    <span className="admin-integrations__list-meta">{c.connector_type} • {c.enabled ? 'Ativo' : 'Inativo'}</span>
                    {c.endpoint_url && <span className="admin-integrations__list-url">{c.endpoint_url}</span>}
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
                    Token: <code>{edgeResult.token}</code>
                  </p>
                )}
                <p className="admin-integrations__muted">Guarde o token em local seguro; ele será usado no agente edge.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
