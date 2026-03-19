/**
 * IMPETUS - ManuIA - Manutenção assistida por IA
 * Pesquisa e renderização de qualquer equipamento por texto
 * Fluxo: Pesquisa → IA → Render 3D → Diagnóstico guiado
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { manutencaoIa } from '../services/api';
import ThreeViewer from '../features/manutencao-ia/ThreeViewer';
import {
  Wrench,
  Search,
  Mic,
  Cpu,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import './ManuIA.css';

const SYMPTOM_CHIPS = [
  { id: 'no_power', label: 'Não liga / sem energia' },
  { id: 'overheating', label: 'Superaquecendo' },
  { id: 'noise', label: 'Fazendo ruído anormal' },
  { id: 'vibration', label: 'Vibração excessiva' },
  { id: 'pressure_flow', label: 'Não atinge pressão/vazão' },
  { id: 'stuck', label: 'Travado / não gira' },
  { id: 'other', label: 'Outro problema...' }
];

export default function ManuIA() {
  const navigate = useNavigate();
  const [equipmentQuery, setEquipmentQuery] = useState('');
  const [research, setResearch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [researchError, setResearchError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [copilotMessage, setCopilotMessage] = useState(null);
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [machines, setMachines] = useState([]);
  const [emergencyEvents, setEmergencyEvents] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const loadInitial = async () => {
    try {
      const [mRes, eRes, recentRes] = await Promise.all([
        manutencaoIa.getMachines().catch(() => ({ data: { machines: [] } })),
        manutencaoIa.getEmergencyEvents().catch(() => ({ data: { events: [] } })),
        manutencaoIa.getRecentSearches(8).catch(() => ({ data: { items: [] } }))
      ]);
      setMachines(mRes.data?.machines || []);
      setEmergencyEvents(eRes.data?.events || []);
      setSuggestions(recentRes.data?.items || recentRes.data || []);
    } catch (e) {
      console.warn('[ManuIA]', e?.message);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (queryOverride) => {
    const q = (queryOverride ?? equipmentQuery).trim();
    if (!q || q.length < 3) return;

    setLoading(true);
    setResearchError(null);
    setResearch(null);
    setCopilotMessage(null);
    setSelectedSymptom(null);

    try {
      const r = await manutencaoIa.researchEquipment(q);
      const data = r.data?.research;
      if (data) {
        setResearch(data);
        const eqName = data.equipment?.name || q;
        const compCount = data.components?.length || 0;
        setCopilotMessage({
          text: `Encontrei o **${eqName}**. Renderizei o modelo no painel com ${compCount} componentes mapeados.\n\nAgora me diga: qual problema você está enfrentando?`,
          equipmentName: eqName
        });
        setSuggestions((prev) => {
          const next = [{ query_original: q, equipment_name: eqName, created_at: new Date().toISOString() }, ...prev.filter((s) => s.query_original !== q)].slice(0, 8);
          return next;
        });
      }
    } catch (e) {
      setResearchError(e?.response?.data?.error || e?.apiMessage || e?.message || 'Erro na pesquisa');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (item) => {
    const q = item.query_original || item.equipment_name || '';
    setEquipmentQuery(q);
    setShowSuggestions(false);
    handleSearch(q);
  };

  const handleSymptomClick = (chip) => {
    setSelectedSymptom(chip);
    const symptomLabel = chip.label;
    navigate('/app/chatbot', {
      state: {
        initialMessage: `Estou no ManuIA. Equipamento: ${research?.equipment?.name || equipmentQuery}. Problema: ${symptomLabel}. Preciso de guia para diagnóstico e desmontagem.`
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <Layout>
      <div className="manuia">
        <header className="manuia-header">
          <div className="manuia-header__left">
            <div className="manuia-header__icon">
              <Wrench size={24} />
            </div>
            <div>
              <h1>ManuIA</h1>
              <p>Pesquise qualquer equipamento e receba guia de manutenção com IA</p>
            </div>
          </div>
        </header>

        {/* ETAPA 1 — Campo de pesquisa central */}
        <section className="manuia-block manuia-block--search">
          <h2><Search size={20} /> Pesquisar equipamento</h2>
          <p className="manuia-block__desc">
            Digite ou fale o equipamento que vai manter. A IA pesquisa e renderiza o modelo em 3D.
          </p>
          <div className="manuia-search-wrap">
            <div className="manuia-search-inner" ref={inputRef}>
              <input
                type="text"
                className="manuia-search-input"
                placeholder="Digite o equipamento que vai manter... Ex: Motor WEG W22 15cv | Bomba Grundfos CM5 | Quadro Schneider NSX 250"
                value={equipmentQuery}
                onChange={(e) => setEquipmentQuery(e.target.value)}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <div className="manuia-search-actions">
                <button
                  type="button"
                  className="manuia-search-mic"
                  title="Pesquisar por voz (em breve)"
                  disabled
                >
                  <Mic size={20} />
                </button>
                <button
                  type="button"
                  className="btn btn-primary manuia-search-btn"
                  onClick={handleSearch}
                  disabled={!equipmentQuery.trim() || equipmentQuery.trim().length < 3 || loading}
                >
                  {loading ? (
                    <>
                      <span className="manuia-spinner-sm" /> Pesquisando...
                    </>
                  ) : (
                    <>
                      <Search size={18} /> Pesquisar e Renderizar
                    </>
                  )}
                </button>
              </div>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="manuia-suggestions" ref={suggestionsRef}>
                <span className="manuia-suggestions__title">Últimas pesquisas</span>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="manuia-suggestion-item"
                    onClick={() => handleSuggestionClick(s)}
                  >
                    {s.equipment_name || s.query_original}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>
          {researchError && (
            <div className="manuia-error">
              <AlertTriangle size={18} />
              <span>{researchError}</span>
            </div>
          )}
        </section>

        {/* ETAPA 3 + 4 — Viewer 3D + Copiloto */}
        {(research || loading) && (
          <section className="manuia-block manuia-two-col">
            <div className="manuia-viewer-col">
              <h2><Cpu size={20} /> Modelo 3D</h2>
              {loading ? (
                <div className="manuia-viewer manuia-viewer--loading">
                  <div className="manuia-spinner" />
                  <p>Pesquisando e renderizando...</p>
                </div>
              ) : (
                <ThreeViewer research={research} />
              )}
            </div>
            <div className="manuia-copilot-col">
              <h2><Sparkles size={20} /> Copiloto IA</h2>
              {copilotMessage ? (
                <div className="manuia-copilot">
                  <div className="manuia-copilot-msg">
                    {copilotMessage.text.split('\n').map((line, i) => (
                      <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                    ))}
                  </div>
                  <div className="manuia-symptom-chips">
                    <span className="manuia-symptom-label">Ou escolha um sintoma comum:</span>
                    {SYMPTOM_CHIPS.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        className={`manuia-symptom-chip ${selectedSymptom?.id === chip.id ? 'manuia-symptom-chip--active' : ''}`}
                        onClick={() => handleSymptomClick(chip)}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                  <p className="manuia-copilot-hint">
                    Clique em um sintoma para abrir o chat com guia de diagnóstico e desmontagem.
                  </p>
                </div>
              ) : (
                <p className="manuia-empty">Pesquise um equipamento para iniciar o fluxo de diagnóstico.</p>
              )}
            </div>
          </section>
        )}

        {emergencyEvents.length > 0 && (
          <section className="manuia-block manuia-block--alert">
            <h2><AlertTriangle size={20} /> Eventos de Emergência</h2>
            <ul className="manuia-event-list">
              {emergencyEvents.slice(0, 5).map((e) => (
                <li key={e.id} className="manuia-event-item">
                  <strong>{e.machine_name || 'Máquina'}</strong>
                  <span>{e.description || e.event_type}</span>
                  <span className={`manuia-badge manuia-badge--${e.severity || 'high'}`}>{e.severity}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="manuia-block">
          <h2><ClipboardList size={20} /> Atalhos</h2>
          <div className="manuia-shortcuts">
            <button type="button" className="manuia-shortcut" onClick={() => navigate('/diagnostic')}>
              <ClipboardList size={16} /> Diagnosticar Falha
            </button>
            <button type="button" className="manuia-shortcut" onClick={() => navigate('/app/chatbot', { state: { initialMessage: 'Mostre minhas ordens de serviço abertas.' } })}>
              <Wrench size={16} /> Minhas OS
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
