/**
 * IMPETUS - ManuIA - Manutenção assistida por IA
 * Pesquisa e renderização de qualquer equipamento por texto
 * Abas: Pesquisa por texto | Diagnóstico 3D (câmera + visão computacional)
 * Fluxo: Pesquisa → IA → Render 3D → Diagnóstico guiado → Concluir sessão
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { manutencaoIa } from '../services/api';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import ManuIAUnityViewer from '../components/manu-ia/ManuIAUnityViewer';
import { getDiagnosisComponent } from '../features/manutencao-ia/diagnosisMapping';
import Vision3DModule from '../modules/vision-3d/Vision3DModule';
import AssetManagementModule from '../modules/asset-management/AssetManagementModule';
import TechnicalLibraryInteligenteModule from '../features/technical-library/TechnicalLibraryInteligenteModule';
import TechnicalFieldAnalysisModule from '../features/technical-library/TechnicalFieldAnalysisModule';
import {
  Wrench,
  Search,
  Mic,
  MicOff,
  Cpu,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ClipboardList,
  Check,
  X,
  Camera,
  TrendingUp,
  Library,
  ImageIcon
} from 'lucide-react';
import './ManuIA.css';

function isStrictAdmin() {
  try {
    return (JSON.parse(localStorage.getItem('impetus_user') || '{}').role || '').toLowerCase() === 'admin';
  } catch {
    return false;
  }
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('search');
  const [equipmentQuery, setEquipmentQuery] = useState('');
  const [research, setResearch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [researchError, setResearchError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [copilotMessage, setCopilotMessage] = useState(null);
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [diagnosisData, setDiagnosisData] = useState(null);
  const [viewMode, setViewMode] = useState('normal');
  const [showConcludeModal, setShowConcludeModal] = useState(false);
  const [showOSModal, setShowOSModal] = useState(false);
  const [osModalData, setOsModalData] = useState(null);
  const [concludeCreateWo, setConcludeCreateWo] = useState(true);
  const [concludeAddCadastro, setConcludeAddCadastro] = useState(false);
  const [concluding, setConcluding] = useState(false);
  const [machines, setMachines] = useState([]);
  const [emergencyEvents, setEmergencyEvents] = useState([]);
  /** UUID de manuia_machines vindo de Gestão de Ativos (?mid=) — liga Diagnóstico 3D e sessão */
  const [linkedMachineId, setLinkedMachineId] = useState(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const linkedMachineIdRef = useRef(null);
  const sessionIdRef = useRef(null);

  const onSpeechResult = useCallback((text) => {
    setEquipmentQuery((q) => (text ? text.trim() : q));
  }, []);

  const { isListening, error: speechError, supported: speechSupported, start: startMic, stop: stopMic } = useSpeechRecognition({
    lang: 'pt-BR',
    onResult: onSpeechResult
  });

  const loadInitial = async () => {
    try {
      const [mRes, eRes, recentRes] = await Promise.all([
        manutencaoIa.getMachines().catch(() => ({ data: { machines: [] } })),
        manutencaoIa.getEmergencyEvents().catch(() => ({ data: { events: [] } })),
        manutencaoIa.getRecentSearches(8).catch(() => ({ data: { items: [] } }))
      ]);
      setMachines(mRes.data?.machines || []);
      setEmergencyEvents(eRes.data?.events || []);
      const items = recentRes.data?.items;
      setSuggestions(Array.isArray(items) ? items : []);
    } catch (e) {
      console.warn('[ManuIA]', e?.message);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'technical-library' && isStrictAdmin()) {
      setActiveTab('technical-library');
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('tab');
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(async (queryOverride, opts) => {
    const fromUrl = opts?.fromUrl === true;
    const machineIdForSession = fromUrl ? (opts?.machineId ?? linkedMachineIdRef.current ?? null) : null;
    if (!fromUrl) {
      linkedMachineIdRef.current = null;
      setLinkedMachineId(null);
    }

    const q = (typeof queryOverride === 'string' ? queryOverride : equipmentQuery).trim();
    if (!q || q.length < 3) return;

    setLoading(true);
    setResearchError(null);
    setResearch(null);
    setCopilotMessage(null);
    setSelectedSymptom(null);
    setDiagnosisData(null);

    try {
      let sessionId = sessionIdRef.current;
      if (!sessionId) {
        try {
          const cr = await manutencaoIa.createSession({
            machine_id: machineIdForSession || null,
            session_type: 'diagnostic'
          });
          const sid = cr.data?.session?.id;
          if (sid) {
            sessionIdRef.current = sid;
            sessionId = sid;
          }
        } catch {
          /* tabelas ManuIA ausentes ou 503 — pesquisa segue sem sessão */
        }
      }
      const r = await manutencaoIa.researchEquipment(q, sessionId || null);
      const data = r.data?.research ?? r.data?.data?.research;
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
  }, [equipmentQuery]);

  const lastConsumedUrlRef = useRef('');
  const qParam = searchParams.get('q');
  const midParam = searchParams.get('mid');
  useEffect(() => {
    const q = (qParam || '').trim();
    const mid = (midParam || '').trim();
    if (!q && !mid) return;
    const key = `${q}__${mid}`;
    if (lastConsumedUrlRef.current === key) return;
    lastConsumedUrlRef.current = key;
    if (mid) {
      linkedMachineIdRef.current = mid;
      setLinkedMachineId(mid);
    }
    if (q) setEquipmentQuery(q);
    setActiveTab('search');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('q');
      next.delete('mid');
      return next;
    }, { replace: true });
    if (q.length >= 3) {
      const t = setTimeout(() => handleSearch(q, { machineId: mid || undefined, fromUrl: true }), 120);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [qParam, midParam, handleSearch, setSearchParams]);

  const handleSuggestionClick = (item) => {
    const q = item.query_original || item.equipment_name || '';
    setEquipmentQuery(q);
    setShowSuggestions(false);
    handleSearch(q);
  };

  const handleSymptomClick = (chip) => {
    setSelectedSymptom(chip);
    const modelType = (research?.model_3d_type || 'generic').toLowerCase();
    const component = getDiagnosisComponent(chip.id, modelType);
    const failure = research?.common_failures?.find(
      (f) => f.symptom && chip.label.toLowerCase().includes((f.symptom || '').toLowerCase().slice(0, 15))
    ) || research?.common_failures?.[0];
    const steps = failure?.solution_steps || ['Desligue o equipamento e bloqueie energias.', 'Identifique o componente suspeito no modelo 3D.', 'Siga o procedimento do fabricante para desmontagem.'];
    setDiagnosisData({
      component,
      rootCause: failure?.root_cause || 'Verifique o componente indicado no modelo.',
      steps
    });
  };

  const handleConclude = async () => {
    setConcluding(true);
    try {
      await manutencaoIa.concludeSession({
        equipment_name: research?.equipment?.name || equipmentQuery,
        equipment_manufacturer: research?.equipment?.manufacturer,
        symptom: selectedSymptom?.label,
        diagnosis_summary: diagnosisData?.rootCause,
        create_work_order: concludeCreateWo,
        add_to_cadastro: concludeAddCadastro
      });
      setShowConcludeModal(false);
      setSelectedSymptom(null);
      setDiagnosisData(null);
      loadInitial();
    } catch (e) {
      console.warn('[ManuIA] conclude:', e);
    } finally {
      setConcluding(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleVisionOS = useCallback((data) => {
    setOsModalData(data);
    setShowOSModal(true);
  }, []);

  const explodeFactor = viewMode === 'exploded' ? 0.6 : 0;

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

        <div className="manuia-tabs">
          <button
            type="button"
            className={`manuia-tab ${activeTab === 'search' ? 'manuia-tab--active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={18} /> Pesquisa por texto
          </button>
          <button
            type="button"
            className={`manuia-tab ${activeTab === 'vision3d' ? 'manuia-tab--active' : ''}`}
            onClick={() => setActiveTab('vision3d')}
          >
            <Camera size={18} /> Diagnóstico 3D
          </button>
          <button
            type="button"
            className={`manuia-tab ${activeTab === 'asset-management' ? 'manuia-tab--active' : ''}`}
            onClick={() => setActiveTab('asset-management')}
          >
            <TrendingUp size={18} /> Gestão de Ativos
          </button>
          <button
            type="button"
            className={`manuia-tab ${activeTab === 'field-analysis' ? 'manuia-tab--active' : ''}`}
            onClick={() => setActiveTab('field-analysis')}
          >
            <ImageIcon size={18} /> Análise foto/vídeo
          </button>
          {isStrictAdmin() && (
            <button
              type="button"
              className={`manuia-tab ${activeTab === 'technical-library' ? 'manuia-tab--active' : ''}`}
              onClick={() => setActiveTab('technical-library')}
            >
              <Library size={18} /> Biblioteca técnica inteligente
            </button>
          )}
        </div>

        {activeTab === 'technical-library' && isStrictAdmin() ? (
          <section className="manuia-block manuia-block--technical-library">
            <TechnicalLibraryInteligenteModule onBack={() => setActiveTab('search')} />
          </section>
        ) : activeTab === 'field-analysis' ? (
          <section className="manuia-block manuia-block--field-analysis">
            <TechnicalFieldAnalysisModule />
          </section>
        ) : activeTab === 'asset-management' ? (
          <section className="manuia-block manuia-block--asset-management">
            <AssetManagementModule
              onNavigateToMachine={(searchText, machineUuid) => {
                if (!searchText && !machineUuid) return;
                const p = new URLSearchParams();
                if (searchText) p.set('q', searchText);
                if (machineUuid) p.set('mid', machineUuid);
                navigate(`/app/manutencao/manuia?${p.toString()}`);
              }}
            />
          </section>
        ) : activeTab === 'vision3d' ? (
          <section className="manuia-block manuia-block--vision3d">
            <Vision3DModule
              machineId={research?.machine_id || linkedMachineId}
              machineName={research?.equipment?.name}
              onDiagnosisComplete={(result) => setDiagnosisData({ visionResult: result })}
              onGenerateOS={handleVisionOS}
            />
          </section>
        ) : (
          <>
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
                list={machines.length > 0 ? 'manuia-machine-datalist' : undefined}
                autoComplete="off"
              />
              {machines.length > 0 && (
                <datalist id="manuia-machine-datalist">
                  {machines.map((m) => (
                    <option key={m.id || m.code} value={m.name || m.code || String(m.id)} />
                  ))}
                </datalist>
              )}
              <div className="manuia-search-actions">
                <button
                  type="button"
                  className={`manuia-search-mic ${isListening ? 'manuia-search-mic--listening' : ''}`}
                  title={speechSupported ? (isListening ? 'Parar gravação' : 'Pesquisar por voz') : 'Microfone não suportado'}
                  onClick={speechSupported ? (isListening ? stopMic : startMic) : undefined}
                  disabled={!speechSupported || loading}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button
                  type="button"
                  className="btn btn-primary manuia-search-btn"
                  onClick={() => handleSearch()}
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
                  <button key={i} type="button" className="manuia-suggestion-item" onClick={() => handleSuggestionClick(s)}>
                    {s.equipment_name || s.query_original}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>
          {speechError && <p className="manuia-error" style={{ marginTop: 8 }}>{speechError}</p>}
          {researchError && (
            <div className="manuia-error">
              <AlertTriangle size={18} />
              <span>{researchError}</span>
            </div>
          )}
        </section>

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
                <ManuIAUnityViewer
                  variant="search"
                  research={research}
                  highlightedComponent={diagnosisData?.component}
                  viewMode={viewMode}
                  explodeFactor={explodeFactor}
                  onViewModeChange={selectedSymptom ? setViewMode : undefined}
                />
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
                  {diagnosisData && (
                    <div className="manuia-diagnosis-panel">
                      <h3>Diagnóstico — {diagnosisData.component}</h3>
                      <p style={{ fontSize: '0.85rem', marginBottom: 8 }}>{diagnosisData.rootCause}</p>
                      <ul className="manuia-diagnosis-steps">
                        {diagnosisData.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                      <div className="manuia-conclude-actions">
                        <button type="button" className="manuia-conclude-btn manuia-conclude-btn--primary" onClick={() => setShowConcludeModal(true)}>
                          <Check size={16} /> Concluir sessão
                        </button>
                        <button type="button" className="manuia-conclude-btn manuia-conclude-btn--secondary" onClick={() => navigate('/app/chatbot', { state: { initialMessage: `ManuIA. Equipamento: ${research?.equipment?.name}. Problema: ${selectedSymptom?.label}. Preciso de mais detalhes.` } })}>
                          Abrir chat
                        </button>
                      </div>
                    </div>
                  )}
                  {!diagnosisData && (
                    <p className="manuia-copilot-hint">
                      Clique em um sintoma para ver o diagnóstico guiado no modelo 3D (câmera, pulsação, raio-x, vista explodida).
                    </p>
                  )}
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
          </>
        )}
      </div>

      {showConcludeModal && (
        <div className="manuia-modal-overlay" onClick={() => !concluding && setShowConcludeModal(false)}>
          <div className="manuia-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Concluir sessão</h3>
            <p>Deseja gerar a ordem de serviço e cadastrar o equipamento?</p>
            <div className="manuia-modal-options">
              <label className={`manuia-modal-option ${concludeCreateWo ? 'manuia-modal-option--selected' : ''}`} onClick={() => setConcludeCreateWo(!concludeCreateWo)}>
                <input type="checkbox" checked={concludeCreateWo} onChange={(e) => setConcludeCreateWo(e.target.checked)} />
                <span>Gerar OS automática</span>
              </label>
              <label className={`manuia-modal-option ${concludeAddCadastro ? 'manuia-modal-option--selected' : ''}`} onClick={() => setConcludeAddCadastro(!concludeAddCadastro)}>
                <input type="checkbox" checked={concludeAddCadastro} onChange={(e) => setConcludeAddCadastro(e.target.checked)} />
                <span>Adicionar equipamento ao cadastro permanente</span>
              </label>
            </div>
            <div className="manuia-modal-actions">
              <button type="button" className="manuia-conclude-btn manuia-conclude-btn--secondary" onClick={() => !concluding && setShowConcludeModal(false)} disabled={concluding}>
                <X size={16} /> Cancelar
              </button>
              <button type="button" className="manuia-conclude-btn manuia-conclude-btn--primary" onClick={handleConclude} disabled={concluding}>
                {concluding ? <span className="manuia-spinner-sm" /> : <Check size={16} />}
                {concluding ? ' Salvando...' : ' Concluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOSModal && osModalData && (
        <div className="manuia-modal-overlay" onClick={() => setShowOSModal(false)}>
          <div className="manuia-modal manuia-modal--os" onClick={(e) => e.stopPropagation()}>
            <h3>Ordem de Serviço — Diagnóstico 3D</h3>
            <div className="manuia-os-summary">
              <p><strong>Equipamento:</strong> {osModalData.equipment || 'N/A'}</p>
              <p><strong>Fabricante:</strong> {osModalData.manufacturer || 'N/A'}</p>
              <p><strong>Severidade:</strong> <span className={`manuia-badge manuia-badge--${osModalData.severity === 'CRITICO' ? 'critical' : osModalData.severity === 'ALERTA' ? 'medium' : 'operational'}`}>{osModalData.severity || 'N/A'}</span></p>
              {osModalData.faultParts?.length > 0 && (
                <p><strong>Peças com falha:</strong> {osModalData.faultParts.join(', ')}</p>
              )}
              {osModalData.steps?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong>Passos:</strong>
                  <ul className="manuia-diagnosis-steps">
                    {osModalData.steps.map((s, i) => (
                      <li key={i}>{s.title || s.desc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="manuia-modal-actions">
              <button type="button" className="manuia-conclude-btn manuia-conclude-btn--secondary" onClick={() => setShowOSModal(false)}>
                <X size={16} /> Fechar
              </button>
              <button type="button" className="manuia-conclude-btn manuia-conclude-btn--primary" onClick={() => { setShowOSModal(false); navigate('/diagnostic', { state: { osData: osModalData } }); }}>
                <ClipboardList size={16} /> Criar OS
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
