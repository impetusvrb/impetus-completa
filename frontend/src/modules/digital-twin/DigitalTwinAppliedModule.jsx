/**
 * GÊMEO DIGITAL APLICADO — Módulo Frontend
 *
 * Sub-painéis: Dashboard | Diagnóstico | Histórico | Memória Industrial
 * Design System Industrial 4.0 — dark + acentos cyan/green/amber/red
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { manutencaoIa, digitalTwin } from '../../services/api';
import {
  Cpu,
  AlertTriangle,
  Activity,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  RefreshCw,
  Eye,
  Wrench,
  Brain,
  TrendingUp,
  BarChart3,
  Thermometer,
  Waves,
  Gauge,
  Camera,
  FileText,
  Database
} from 'lucide-react';
import './DigitalTwinApplied.css';

const CRITICALITY_CONFIG = {
  normal: { color: 'var(--green)', label: 'Normal', icon: CheckCircle },
  low: { color: 'var(--green)', label: 'Baixo', icon: CheckCircle },
  medium: { color: 'var(--amber)', label: 'Médio', icon: AlertTriangle },
  high: { color: 'var(--orange, #ff6b00)', label: 'Alto', icon: AlertTriangle },
  critical: { color: 'var(--red)', label: 'Crítico', icon: XCircle }
};

function CriticalityBadge({ level }) {
  const cfg = CRITICALITY_CONFIG[level] || CRITICALITY_CONFIG.low;
  const Icon = cfg.icon;
  return (
    <span className="gda-criticality-badge" style={{ '--badge-color': cfg.color }}>
      <Icon size={14} /> {cfg.label}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, accent = 'var(--cyan)' }) {
  return (
    <div className="gda-kpi-card" style={{ '--kpi-accent': accent }}>
      <div className="gda-kpi-icon"><Icon size={20} /></div>
      <div className="gda-kpi-body">
        <span className="gda-kpi-value">{value ?? '—'}</span>
        <span className="gda-kpi-label">{label}</span>
      </div>
    </div>
  );
}

function SensorStatusDot({ status }) {
  const colors = {
    normal: 'var(--green)',
    attention: 'var(--amber)',
    critical: 'var(--orange, #ff6b00)',
    failure: 'var(--red)'
  };
  return (
    <span
      className="gda-sensor-dot"
      style={{ background: colors[status] || 'var(--text-tertiary)' }}
      title={status}
    />
  );
}

function VisualAssetCard({ asset }) {
  let data = {};
  try {
    data = typeof asset.content_text === 'string' ? JSON.parse(asset.content_text) : asset.content_text || {};
  } catch { data = {}; }

  return (
    <div className="gda-visual-card">
      <div className="gda-visual-card__header">
        <Eye size={16} />
        <span>{data.title || asset.description || asset.asset_type}</span>
      </div>
      {data.description && <p className="gda-visual-card__desc">{data.description}</p>}
      {data.components_shown?.length > 0 && (
        <div className="gda-visual-components">
          {data.components_shown.map((c, i) => (
            <div key={i} className="gda-visual-component-item" style={{
              borderLeftColor: c.highlight_color === 'red' ? 'var(--red)' :
                c.highlight_color === 'orange' ? 'var(--orange, #ff6b00)' :
                c.highlight_color === 'yellow' ? 'var(--amber)' : 'var(--green)'
            }}>
              <strong>{c.name}</strong>
              {c.position && <span className="gda-visual-meta"> — {c.position}</span>}
              {c.annotation && <p className="gda-visual-annotation">{c.annotation}</p>}
            </div>
          ))}
        </div>
      )}
      {data.failure_indicators?.length > 0 && (
        <div className="gda-visual-indicators">
          {data.failure_indicators.map((fi, i) => (
            <span key={i} className="gda-tag gda-tag--red">{fi}</span>
          ))}
        </div>
      )}
      {data.safety_warnings?.length > 0 && (
        <div className="gda-safety-warnings">
          {data.safety_warnings.map((w, i) => (
            <div key={i} className="gda-safety-item"><Shield size={14} /> {w}</div>
          ))}
        </div>
      )}
      {data.ai_generated_disclaimer && (
        <p className="gda-ai-disclaimer">{data.ai_generated_disclaimer}</p>
      )}
    </div>
  );
}

function ProcedurePanel({ procedure }) {
  if (!procedure || !Object.keys(procedure).length) return null;
  const p = typeof procedure === 'string' ? JSON.parse(procedure) : procedure;

  const renderList = (title, icon, items) => {
    if (!items?.length) return null;
    const Icon = icon;
    return (
      <div className="gda-procedure-section">
        <h4><Icon size={16} /> {title}</h4>
        <ol className="gda-procedure-list">
          {items.map((item, i) => (
            <li key={i}>{typeof item === 'object' ? `${item.name} (x${item.quantity || 1}) — ${item.specification || ''}` : item}</li>
          ))}
        </ol>
      </div>
    );
  };

  return (
    <div className="gda-procedure-panel">
      <h3 className="gda-section-title"><FileText size={18} /> {p.title || 'Procedimento de Manutenção'}</h3>
      {p.root_cause_analysis && (
        <div className="gda-procedure-section">
          <h4><Brain size={16} /> Análise de Causa Raiz</h4>
          <p>{p.root_cause_analysis}</p>
        </div>
      )}
      {renderList('Plano de Ação', Wrench, p.action_plan)}
      {renderList('Checklist Pré-Intervenção', CheckCircle, p.checklist_pre)}
      {renderList('Ferramentas Necessárias', Wrench, p.tools_required)}
      {renderList('Peças Necessárias', Database, p.spare_parts)}
      {renderList('Desmontagem', ChevronRight, p.disassembly_steps)}
      {renderList('Montagem', ChevronRight, p.assembly_steps)}
      {p.loto_procedure && (
        <div className="gda-procedure-section gda-loto">
          <h4><Shield size={16} /> LOTO — Bloqueio e Etiquetagem</h4>
          {renderList('Fontes de Energia', Zap, p.loto_procedure.energy_sources)}
          {renderList('Pontos de Isolamento', Shield, p.loto_procedure.isolation_points)}
          {renderList('Verificação Energia Zero', CheckCircle, p.loto_procedure.verification_steps)}
        </div>
      )}
      {renderList('Teste Pós-Manutenção', Activity, p.post_maintenance_test)}
      {renderList('Validação Final', CheckCircle, p.final_validation)}
      {p.estimated_duration_minutes && (
        <div className="gda-procedure-meta">
          <Clock size={14} /> Duração estimada: <strong>{p.estimated_duration_minutes} min</strong>
        </div>
      )}
      {p.safety_requirements?.length > 0 && (
        <div className="gda-safety-warnings">
          {p.safety_requirements.map((w, i) => (
            <div key={i} className="gda-safety-item"><Shield size={14} /> {w}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendPanel({ trend }) {
  if (!trend || !trend.trends) return null;
  const sensors = ['temperature', 'vibration', 'current', 'pressure'];
  const sensorIcons = { temperature: Thermometer, vibration: Waves, current: Zap, pressure: Gauge };
  const sensorLabels = { temperature: 'Temperatura', vibration: 'Vibração', current: 'Corrente', pressure: 'Pressão' };

  return (
    <div className="gda-trend-panel">
      <h3 className="gda-section-title"><TrendingUp size={18} /> Análise de Tendência</h3>
      <div className="gda-trend-grid">
        {sensors.map((key) => {
          const t = trend.trends[key];
          if (!t) return null;
          const Icon = sensorIcons[key];
          return (
            <div key={key} className="gda-trend-card" data-status={t.status}>
              <div className="gda-trend-header">
                <Icon size={18} />
                <span>{sensorLabels[key]}</span>
                <SensorStatusDot status={t.status} />
              </div>
              <div className="gda-trend-body">
                <div className="gda-trend-row">
                  <span className="gda-trend-label">Direção:</span>
                  <span className={`gda-trend-value gda-trend-dir--${t.direction}`}>{t.direction}</span>
                </div>
                {t.rate && <div className="gda-trend-row"><span className="gda-trend-label">Taxa:</span><span>{t.rate}</span></div>}
                {t.alarm_threshold_eta && (
                  <div className="gda-trend-row gda-trend-alarm">
                    <span className="gda-trend-label">ETA alarme:</span><span>{t.alarm_threshold_eta}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {trend.failure_prediction && (
        <div className="gda-prediction-panel">
          <h4><AlertTriangle size={16} /> Predição de Falha</h4>
          <div className="gda-prediction-grid">
            <div className="gda-prediction-item">
              <span className="gda-prediction-value">{trend.failure_prediction.probability_next_7_days}%</span>
              <span className="gda-prediction-label">Próximos 7 dias</span>
            </div>
            <div className="gda-prediction-item">
              <span className="gda-prediction-value">{trend.failure_prediction.probability_next_30_days}%</span>
              <span className="gda-prediction-label">Próximos 30 dias</span>
            </div>
          </div>
          {trend.failure_prediction.most_likely_failure_mode && (
            <p className="gda-prediction-detail">
              Modo mais provável: <strong>{trend.failure_prediction.most_likely_failure_mode}</strong>
            </p>
          )}
          {trend.failure_prediction.recommended_preventive_date && (
            <p className="gda-prediction-detail">
              Preventiva recomendada: <strong>{trend.failure_prediction.recommended_preventive_date}</strong>
            </p>
          )}
        </div>
      )}
      {trend.recommendation && (
        <div className="gda-recommendation"><Brain size={16} /> {trend.recommendation}</div>
      )}
    </div>
  );
}

export default function DigitalTwinAppliedModule() {
  const [subView, setSubView] = useState('dashboard');
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [activeDiagnostic, setActiveDiagnostic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [error, setError] = useState('');
  const imageInputRef = useRef(null);

  const loadMachines = useCallback(async () => {
    try {
      const r = await manutencaoIa.getMachines();
      setMachines(r.data?.machines || []);
    } catch { /* ok */ }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const r = await digitalTwin.getDashboard();
      setDashboardData(r.data);
    } catch { /* ok */ }
  }, []);

  const loadDiagnostics = useCallback(async () => {
    try {
      const r = await digitalTwin.listDiagnostics({
        machine_id: selectedMachine || undefined,
        limit: 20
      });
      setDiagnostics(r.data?.diagnostics || []);
    } catch { /* ok */ }
  }, [selectedMachine]);

  useEffect(() => {
    loadMachines();
    loadDashboard();
    loadDiagnostics();
  }, [loadMachines, loadDashboard, loadDiagnostics]);

  const handleRunDiagnostic = async (imageBase64 = null) => {
    if (!selectedMachine) {
      setError('Selecione uma máquina para diagnóstico.');
      return;
    }
    setDiagnosing(true);
    setError('');
    try {
      const r = await digitalTwin.diagnose({
        machine_id: selectedMachine,
        trigger_source: imageBase64 ? 'manual' : 'manual',
        trigger_data: {},
        image_base64: imageBase64 || undefined
      });
      if (r.data?.ok) {
        setActiveDiagnostic(r.data.diagnostic);
        setSubView('result');
        loadDiagnostics();
        loadDashboard();
      } else {
        setError(r.data?.error || 'Falha no diagnóstico');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao executar diagnóstico');
    } finally {
      setDiagnosing(false);
    }
  };

  const handleImageDiagnostic = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result?.split(',')[1] || reader.result;
      handleRunDiagnostic(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleViewDiagnostic = async (id) => {
    setLoading(true);
    try {
      const r = await digitalTwin.getDiagnostic(id);
      if (r.data?.ok) {
        setActiveDiagnostic(r.data.diagnostic);
        setSubView('result');
      }
    } catch { /* ok */ } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!activeDiagnostic?.id) return;
    const solution = prompt('Descreva a solução aplicada:');
    if (!solution) return;
    const minutes = prompt('Tempo de reparo (minutos):');
    try {
      await digitalTwin.resolveDiagnostic(activeDiagnostic.id, {
        solution_applied: solution,
        repair_time_minutes: parseInt(minutes) || null,
        effectiveness: 'effective'
      });
      setActiveDiagnostic((d) => ({ ...d, status: 'resolved' }));
      loadDiagnostics();
      loadDashboard();
    } catch { /* ok */ }
  };

  const kpis = dashboardData?.kpis || {};
  const topFails = dashboardData?.topFailures || [];

  return (
    <div className="gda-module">
      <div className="gda-header">
        <div className="gda-header__title">
          <Cpu size={24} />
          <div>
            <h2>GÊMEO DIGITAL APLICADO</h2>
            <span className="gda-header__subtitle">Diagnóstico Industrial Inteligente — Motor Gemini</span>
          </div>
        </div>
        <div className="gda-header__actions">
          <button
            className={`gda-nav-btn ${subView === 'dashboard' ? 'gda-nav-btn--active' : ''}`}
            onClick={() => setSubView('dashboard')}
          >
            <BarChart3 size={16} /> Dashboard
          </button>
          <button
            className={`gda-nav-btn ${subView === 'diagnose' ? 'gda-nav-btn--active' : ''}`}
            onClick={() => setSubView('diagnose')}
          >
            <Brain size={16} /> Diagnosticar
          </button>
          <button
            className={`gda-nav-btn ${subView === 'history' ? 'gda-nav-btn--active' : ''}`}
            onClick={() => { setSubView('history'); loadDiagnostics(); }}
          >
            <Database size={16} /> Histórico
          </button>
        </div>
      </div>

      {error && <div className="gda-error"><AlertTriangle size={16} /> {error}</div>}

      {/* ═══ DASHBOARD ═══ */}
      {subView === 'dashboard' && (
        <div className="gda-dashboard">
          <div className="gda-kpi-strip">
            <KpiCard icon={Activity} label="Diagnósticos ativos" value={kpis.active_diagnostics} accent="var(--cyan)" />
            <KpiCard icon={AlertTriangle} label="Alertas críticos" value={kpis.critical_alerts} accent="var(--red)" />
            <KpiCard icon={CheckCircle} label="Resolvidos" value={kpis.resolved_diagnostics} accent="var(--green)" />
            <KpiCard icon={Database} label="Memória industrial" value={kpis.memory_entries} accent="var(--amber)" />
            <KpiCard icon={Clock} label="Tempo médio reparo" value={kpis.avg_repair_time_minutes ? `${kpis.avg_repair_time_minutes}min` : '—'} accent="var(--cyan)" />
          </div>

          {topFails.length > 0 && (
            <div className="gda-top-failures">
              <h3 className="gda-section-title"><TrendingUp size={18} /> Falhas Mais Frequentes</h3>
              <div className="gda-failures-table">
                <div className="gda-ft-header">
                  <span>Componente</span><span>Tipo de Falha</span><span>Ocorrências</span><span>Tempo Médio</span><span>Efetividade</span>
                </div>
                {topFails.map((f, i) => (
                  <div key={i} className="gda-ft-row">
                    <span>{f.component}</span>
                    <span>{f.failure_type}</span>
                    <span className="gda-ft-count">{f.occurrences}</span>
                    <span>{f.avg_repair ? `${f.avg_repair}min` : '—'}</span>
                    <span className={`gda-ft-eff gda-ft-eff--${f.common_effectiveness}`}>{f.common_effectiveness || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="gda-dash-actions">
            <button className="gda-primary-btn" onClick={() => setSubView('diagnose')}>
              <Brain size={18} /> Iniciar Diagnóstico
            </button>
          </div>
        </div>
      )}

      {/* ═══ DIAGNOSTICAR ═══ */}
      {subView === 'diagnose' && (
        <div className="gda-diagnose">
          <h3 className="gda-section-title"><Brain size={18} /> Novo Diagnóstico Industrial</h3>
          <div className="gda-diagnose-form">
            <label className="gda-form-label">Máquina</label>
            <select
              className="gda-select"
              value={selectedMachine || ''}
              onChange={(e) => setSelectedMachine(e.target.value || null)}
            >
              <option value="">Selecione uma máquina...</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.name} — {m.sector || 'Sem setor'} {m.line_name ? `(${m.line_name})` : ''}</option>
              ))}
            </select>

            <div className="gda-diagnose-actions">
              <button
                className="gda-primary-btn"
                onClick={() => handleRunDiagnostic()}
                disabled={diagnosing || !selectedMachine}
              >
                {diagnosing ? <><RefreshCw size={18} className="gda-spin" /> Analisando com Gemini...</> : <><Cpu size={18} /> Diagnóstico por Sensores</>}
              </button>
              <button
                className="gda-secondary-btn"
                onClick={() => imageInputRef.current?.click()}
                disabled={diagnosing || !selectedMachine}
              >
                <Camera size={18} /> Diagnóstico por Imagem
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageDiagnostic}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ RESULTADO DIAGNÓSTICO ═══ */}
      {subView === 'result' && activeDiagnostic && (
        <DiagnosticResult
          diagnostic={activeDiagnostic}
          onBack={() => setSubView('dashboard')}
          onResolve={handleResolve}
        />
      )}

      {/* ═══ HISTÓRICO ═══ */}
      {subView === 'history' && (
        <div className="gda-history">
          <h3 className="gda-section-title"><Database size={18} /> Histórico de Diagnósticos</h3>
          <div className="gda-history-filters">
            <select
              className="gda-select gda-select--sm"
              value={selectedMachine || ''}
              onChange={(e) => setSelectedMachine(e.target.value || null)}
            >
              <option value="">Todas as máquinas</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button className="gda-ghost-btn" onClick={loadDiagnostics}><RefreshCw size={14} /> Atualizar</button>
          </div>
          {diagnostics.length === 0 ? (
            <div className="gda-empty">Nenhum diagnóstico registrado. Inicie um diagnóstico para começar.</div>
          ) : (
            <div className="gda-diagnostics-list">
              {diagnostics.map((d) => (
                <div key={d.id} className="gda-diag-card" onClick={() => handleViewDiagnostic(d.id)}>
                  <div className="gda-diag-card__header">
                    <span className="gda-diag-machine">{d.machine_name || 'Máquina'}</span>
                    <CriticalityBadge level={d.criticality} />
                  </div>
                  <div className="gda-diag-card__body">
                    <p><strong>Causa:</strong> {d.probable_cause || '—'}</p>
                    <p><strong>Componente:</strong> {d.affected_component || '—'}</p>
                    <p><strong>Ação:</strong> {d.recommended_action || '—'}</p>
                  </div>
                  <div className="gda-diag-card__footer">
                    <span className={`gda-status gda-status--${d.status}`}>{d.status}</span>
                    <span className="gda-diag-date">{new Date(d.created_at).toLocaleString('pt-BR')}</span>
                    <span className="gda-diag-confidence">Confiança: {d.confidence || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <div className="gda-loading-overlay"><RefreshCw size={32} className="gda-spin" /></div>}
    </div>
  );
}

function DiagnosticResult({ diagnostic, onBack, onResolve }) {
  const d = diagnostic;
  const diagnosis = typeof d.diagnosis === 'string' ? JSON.parse(d.diagnosis) : d.diagnosis || {};
  const procedure = typeof d.maintenance_procedure === 'string' ? JSON.parse(d.maintenance_procedure) : d.maintenance_procedure || d.maintenanceProcedure || {};
  const trendData = typeof d.trend_snapshot === 'string' ? JSON.parse(d.trend_snapshot) : d.trend_snapshot || d.trendAnalysis || {};
  const visualAssets = d.visual_assets || d.visualAssets || [];
  const machine = d.machine || { name: d.machine_name, sector: d.sector, line_name: d.line_name };

  return (
    <div className="gda-result">
      <div className="gda-result__nav">
        <button className="gda-ghost-btn" onClick={onBack}>← Voltar</button>
        {(d.status === 'active' || diagnostic.status === 'active') && (
          <button className="gda-primary-btn gda-btn--sm" onClick={onResolve}>
            <CheckCircle size={16} /> Resolver Diagnóstico
          </button>
        )}
      </div>

      {/* Painel de diagnóstico */}
      <div className="gda-diagnosis-panel">
        <h3 className="gda-section-title"><Cpu size={18} /> Painel de Diagnóstico</h3>
        <div className="gda-diagnosis-grid">
          <div className="gda-diagnosis-item">
            <span className="gda-diagnosis-label">Máquina</span>
            <span className="gda-diagnosis-value">{machine.name || '—'}</span>
          </div>
          <div className="gda-diagnosis-item">
            <span className="gda-diagnosis-label">Componente Afetado</span>
            <span className="gda-diagnosis-value">{diagnosis.affected_component || '—'}</span>
          </div>
          <div className="gda-diagnosis-item">
            <span className="gda-diagnosis-label">Falha Detectada</span>
            <span className="gda-diagnosis-value">{diagnosis.probable_cause || '—'}</span>
          </div>
          <div className="gda-diagnosis-item">
            <span className="gda-diagnosis-label">Criticidade</span>
            <CriticalityBadge level={diagnosis.criticality || d.criticality} />
          </div>
          <div className="gda-diagnosis-item">
            <span className="gda-diagnosis-label">Confiança</span>
            <span className="gda-diagnosis-value">{diagnosis.confidence || 0}%</span>
          </div>
          <div className="gda-diagnosis-item">
            <span className="gda-diagnosis-label">Risco Operacional</span>
            <span className="gda-diagnosis-value">{diagnosis.operational_risk || '—'}</span>
          </div>
          <div className="gda-diagnosis-item">
            <span className="gda-diagnosis-label">Impacto Produtivo</span>
            <span className="gda-diagnosis-value">{diagnosis.production_impact || '—'}</span>
          </div>
          <div className="gda-diagnosis-item">
            <span className="gda-diagnosis-label">Tempo Estimado</span>
            <span className="gda-diagnosis-value">{diagnosis.intervention_time_estimate || '—'}</span>
          </div>
        </div>

        {diagnosis.sensor_analysis && (
          <div className="gda-sensor-analysis">
            <h4><Activity size={16} /> Análise de Sensores</h4>
            <div className="gda-sensor-grid">
              {Object.entries(diagnosis.sensor_analysis).map(([key, val]) => (
                <div key={key} className="gda-sensor-card" data-status={val.status}>
                  <span className="gda-sensor-name">{key}</span>
                  <SensorStatusDot status={val.status} />
                  <span className="gda-sensor-trend">{val.trend}</span>
                  {val.detail && <span className="gda-sensor-detail">{val.detail}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {diagnosis.differential_diagnosis?.length > 0 && (
          <div className="gda-differential">
            <h4><Brain size={16} /> Diagnóstico Diferencial</h4>
            <ol className="gda-diff-list">
              {diagnosis.differential_diagnosis.map((h, i) => <li key={i}>{h}</li>)}
            </ol>
          </div>
        )}

        {diagnosis.recommended_action && (
          <div className="gda-recommendation">
            <Wrench size={16} /> <strong>Ação Recomendada:</strong> {diagnosis.recommended_action}
          </div>
        )}
      </div>

      {/* Representações visuais */}
      {visualAssets.length > 0 && (
        <div className="gda-visuals-section">
          <h3 className="gda-section-title"><Eye size={18} /> Representações Visuais</h3>
          <div className="gda-visuals-grid">
            {visualAssets.map((va) => <VisualAssetCard key={va.id} asset={va} />)}
          </div>
        </div>
      )}

      {/* Análise de tendência */}
      {trendData && Object.keys(trendData).length > 0 && <TrendPanel trend={trendData} />}

      {/* Procedimento de manutenção */}
      <ProcedurePanel procedure={procedure} />
    </div>
  );
}
