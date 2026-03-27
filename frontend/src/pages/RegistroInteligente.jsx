/**
 * REGISTRO INTELIGENTE
 * Módulo para todos os usuários — memória operacional assistida por IA
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileEdit,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lightbulb,
  Factory,
  Wrench,
  Shield,
  Package,
  Zap,
  ChevronDown,
  ChevronUp,
  Users,
  LayoutList
} from 'lucide-react';
import Layout from '../components/Layout';
import { intelligentRegistration } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './RegistroInteligente.css';

const SHORTCUTS = [
  { id: 'atividades', label: 'Atividades executadas', icon: CheckCircle2 },
  { id: 'problemas', label: 'Problemas encontrados', icon: AlertTriangle },
  { id: 'pendencias', label: 'Pendências', icon: Clock },
  { id: 'atualizacoes', label: 'Atualizações do dia', icon: Zap },
  { id: 'sugestoes', label: 'Sugestões', icon: Lightbulb },
  { id: 'ocorrencias', label: 'Ocorrências', icon: AlertTriangle },
  { id: 'producao', label: 'Produção', icon: Factory },
  { id: 'manutencao', label: 'Manutenção', icon: Wrench },
  { id: 'qualidade', label: 'Qualidade', icon: Package },
  { id: 'seguranca', label: 'Segurança', icon: Shield }
];

const PRIORITY_LABELS = { normal: 'Normal', atencao: 'Atenção', urgente: 'Urgente', critico: 'Crítico' };
const PRIORITY_COLORS = { normal: 'normal', atencao: 'warning', urgente: 'urgent', critico: 'critical' };

const CATEGORY_LABELS = {
  operacional: 'Operacional',
  producao: 'Produção',
  manutencao: 'Manutenção',
  qualidade: 'Qualidade',
  seguranca: 'Segurança',
  melhoria: 'Melhoria',
  comunicacao: 'Comunicação',
  gestao: 'Gestão',
  rotina: 'Rotina',
  pendencia_critica: 'Pendência crítica',
  observacao_relevante: 'Observação relevante'
};

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch {
    return {};
  }
}

function canAccessLeadership() {
  const u = getStoredUser();
  const level = u.hierarchy_level ?? 5;
  return level <= 2;
}

export default function RegistroInteligente() {
  const notify = useNotification();
  const [text, setText] = useState('');
  const [shiftName, setShiftName] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [leadershipRegs, setLeadershipRegs] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingLeadership, setLoadingLeadership] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [tab, setTab] = useState('mine'); // mine | leadership

  const showLeadershipTab = useMemo(() => canAccessLeadership(), []);

  const loadRegistrations = useCallback(async () => {
    try {
      setLoadingList(true);
      const r = await intelligentRegistration.list({ limit: 40 });
      setRegistrations(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar registros');
    } finally {
      setLoadingList(false);
    }
  }, [notify]);

  const loadLeadership = useCallback(async () => {
    try {
      setLoadingLeadership(true);
      const r = await intelligentRegistration.leadership({ limit: 60 });
      setLeadershipRegs(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar visão de liderança');
    } finally {
      setLoadingLeadership(false);
    }
  }, [notify]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  useEffect(() => {
    if (tab === 'leadership' && showLeadershipTab) {
      loadLeadership();
    }
  }, [tab, showLeadershipTab, loadLeadership]);

  const handleShortcut = (shortcut) => {
    const templates = {
      atividades: 'Atividades executadas: ',
      problemas: 'Problemas encontrados: ',
      pendencias: 'Pendências: ',
      atualizacoes: 'Atualizações do dia: ',
      sugestoes: 'Sugestões: ',
      ocorrencias: 'Ocorrências: ',
      producao: 'Produção: ',
      manutencao: 'Manutenção: ',
      qualidade: 'Qualidade: ',
      seguranca: 'Segurança: '
    };
    const prefix = templates[shortcut.id] || '';
    setText((prev) => (prev ? `${prev}\n${prefix}` : prefix));
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 10) {
      notify.error('Digite pelo menos uma frase descrevendo o que aconteceu.');
      return;
    }

    try {
      setLoading(true);
      await intelligentRegistration.create({
        text: trimmed,
        shift_name: shiftName.trim() || undefined
      });
      notify.success('Registro processado pela IA e guardado na memória operacional.');
      setText('');
      loadRegistrations();
      if (tab === 'leadership') loadLeadership();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  const listData = tab === 'leadership' ? leadershipRegs : registrations;
  const listLoading = tab === 'leadership' ? loadingLeadership : loadingList;

  return (
    <Layout>
      <div className="registro-inteligente-page">
        <div className="registro-hero">
          <div className="registro-header">
            <div className="registro-header-left">
              <div className="registro-icon">
                <FileEdit size={28} />
              </div>
              <div>
                <h1 className="registro-title">Registro Inteligente</h1>
                <p className="registro-subtitle">
                  Memória operacional assistida por IA — registe o seu dia, pendências, ocorrências e sugestões.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="registro-main">
          <div className="registro-card registro-card--composer">
            <p className="registro-instruction">
              Registre aqui tudo o que você achar importante sobre seu dia de trabalho. Conte o que foi feito, o que
              aconteceu, problemas encontrados, atualizações, pendências, observações e qualquer informação relevante.
            </p>

            <div className="registro-shortcuts">
              {SHORTCUTS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="registro-shortcut"
                    onClick={() => handleShortcut(s)}
                  >
                    <Icon size={14} />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            <textarea
              className="registro-textarea"
              placeholder="Ex.: descreva as tarefas executadas, atualizações do setor, problemas encontrados, ações tomadas, pendências, observações de produção, manutenção, qualidade ou segurança."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              disabled={loading}
            />

            <div className="registro-shift-row">
              <label className="registro-shift-label" htmlFor="reg-shift">
                Turno (opcional)
              </label>
              <input
                id="reg-shift"
                type="text"
                className="registro-shift-input"
                placeholder="Ex.: Manhã, Tarde, 22x06"
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="registro-actions">
              <button
                type="button"
                className="btn-registrar-ia"
                onClick={handleSubmit}
                disabled={loading || !text.trim()}
              >
                <Sparkles size={20} />
                {loading ? 'A processar com IA…' : 'Registrar com IA'}
              </button>
            </div>
          </div>

          <div className="registro-history">
            <div className="registro-history-head">
              <h2 className="registro-history-title">
                <LayoutList size={20} className="registro-history-title-icon" />
                Histórico
              </h2>
              {showLeadershipTab && (
                <div className="registro-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'mine'}
                    className={`registro-tab ${tab === 'mine' ? 'active' : ''}`}
                    onClick={() => setTab('mine')}
                  >
                    Meus registros
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'leadership'}
                    className={`registro-tab ${tab === 'leadership' ? 'active' : ''}`}
                    onClick={() => setTab('leadership')}
                  >
                    <Users size={16} /> Visão liderança
                  </button>
                </div>
              )}
            </div>

            {tab === 'leadership' && (
              <p className="registro-leadership-hint">
                Consolidação dos registos da empresa para acompanhamento, prioridades e contexto operacional.
              </p>
            )}

            {listLoading ? (
              <div className="registro-loading">A carregar…</div>
            ) : listData.length === 0 ? (
              <div className="registro-empty">
                {tab === 'leadership'
                  ? 'Nenhum registo encontrado no período.'
                  : 'Ainda não tem registos. Comece por descrever o seu dia.'}
              </div>
            ) : (
              <div className="registro-list">
                {listData.map((reg) => (
                  <RegistroCard
                    key={reg.id}
                    reg={reg}
                    expanded={expandedId === reg.id}
                    onToggle={() => setExpandedId(expandedId === reg.id ? null : reg.id)}
                    showUser={tab === 'leadership'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function RegistroCard({ reg, expanded, onToggle, showUser }) {
  const dateStr = reg.registration_date
    ? new Date(reg.registration_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const timeStr = reg.created_at
    ? new Date(reg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const meta = reg.ai_metadata && typeof reg.ai_metadata === 'object' ? reg.ai_metadata : {};
  const sections = meta.organized_sections && typeof meta.organized_sections === 'object' ? meta.organized_sections : null;
  const questions = Array.isArray(meta.complementary_questions) ? meta.complementary_questions : [];
  const criticalHi = Array.isArray(meta.critical_highlights) ? meta.critical_highlights : [];
  const followClass = meta.follow_up_classification;
  const catLabel = CATEGORY_LABELS[reg.main_category] || reg.main_category;

  return (
    <div className={`registro-card-item registro-card-item--${PRIORITY_COLORS[reg.priority] || 'normal'}`}>
      <div
        className="registro-card-header"
        onClick={onToggle}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
        role="button"
        tabIndex={0}
      >
        <div className="registro-card-meta">
          <span className="registro-card-date">{dateStr}</span>
          <span className="registro-card-time">{timeStr}</span>
          {reg.shift_name && <span className="registro-card-shift">{reg.shift_name}</span>}
          {showUser && reg.user_name && <span className="registro-card-user">{reg.user_name}</span>}
          {reg.main_category && <span className="registro-card-category">{catLabel}</span>}
          {reg.priority && reg.priority !== 'normal' && (
            <span className={`registro-badge registro-badge--${PRIORITY_COLORS[reg.priority]}`}>
              {PRIORITY_LABELS[reg.priority]}
            </span>
          )}
        </div>
        <p className="registro-card-summary">{reg.ai_summary || reg.original_text?.slice(0, 140)}</p>
        {expanded ? <ChevronUp size={18} className="registro-chevron" /> : <ChevronDown size={18} className="registro-chevron" />}
      </div>

      {expanded && (
        <div className="registro-card-detail">
          <div className="registro-ai-summary-block">
            <strong>Resumo IA</strong>
            <p>{reg.ai_summary}</p>
          </div>

          <div className="registro-original">
            <strong>Texto original</strong>
            <p>{reg.original_text}</p>
          </div>

          {(reg.activities_detected?.length ||
            reg.problems_detected?.length ||
            reg.pendencies_detected?.length ||
            reg.suggestions_detected?.length ||
            meta.occurrences_detected?.length ||
            meta.actions_taken_detected?.length) > 0 && (
            <div className="registro-extracted">
              <strong className="registro-detail-heading">Extraído automaticamente</strong>
              {reg.activities_detected?.length > 0 && (
                <div>
                  <strong>Atividades:</strong> {reg.activities_detected.join('; ')}
                </div>
              )}
              {meta.actions_taken_detected?.length > 0 && (
                <div>
                  <strong>Ações tomadas:</strong> {meta.actions_taken_detected.join('; ')}
                </div>
              )}
              {reg.problems_detected?.length > 0 && (
                <div>
                  <strong>Problemas:</strong> {reg.problems_detected.join('; ')}
                </div>
              )}
              {meta.occurrences_detected?.length > 0 && (
                <div>
                  <strong>Ocorrências:</strong> {meta.occurrences_detected.join('; ')}
                </div>
              )}
              {reg.pendencies_detected?.length > 0 && (
                <div>
                  <strong>Pendências:</strong> {reg.pendencies_detected.join('; ')}
                </div>
              )}
              {reg.suggestions_detected?.length > 0 && (
                <div>
                  <strong>Sugestões:</strong> {reg.suggestions_detected.join('; ')}
                </div>
              )}
            </div>
          )}

          {sections && (
            <div className="registro-sections">
              <strong className="registro-detail-heading">Relato organizado</strong>
              {Object.entries(sections).map(([key, val]) => {
                const arr = Array.isArray(val) ? val.filter(Boolean) : [];
                if (!arr.length) return null;
                const label = key.replace(/_/g, ' ');
                return (
                  <div key={key} className="registro-section-block">
                    <span className="registro-section-key">{label}</span>
                    <ul>
                      {arr.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {(reg.line_identified ||
            reg.machine_identified ||
            reg.sector_identified ||
            reg.department_identified ||
            reg.process_identified ||
            reg.product_identified) && (
            <div className="registro-context">
              {reg.sector_identified && <span>Setor: {reg.sector_identified}</span>}
              {reg.department_identified && <span>Departamento: {reg.department_identified}</span>}
              {reg.line_identified && <span>Linha: {reg.line_identified}</span>}
              {reg.machine_identified && <span>Máquina: {reg.machine_identified}</span>}
              {reg.process_identified && <span>Processo: {reg.process_identified}</span>}
              {reg.product_identified && <span>Produto: {reg.product_identified}</span>}
            </div>
          )}

          {meta.impact_perceived && (
            <p className="registro-impact">
              <strong>Impacto percebido:</strong> {meta.impact_perceived}
            </p>
          )}

          {followClass && (
            <span className="registro-follow-class">Tratamento sugerido: {followClass}</span>
          )}

          {criticalHi.length > 0 && (
            <div className="registro-critical-box">
              <strong>Pontos de atenção</strong>
              <ul>
                {criticalHi.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {questions.length > 0 && (
            <div className="registro-questions">
              <strong>Perguntas complementares sugeridas pela IA</strong>
              <ul>
                {questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {meta.suggested_followup_message && (
            <div className="registro-suggest-action">
              <Sparkles size={16} />
              <span>{meta.suggested_followup_message}</span>
            </div>
          )}

          <div className="registro-flags-row">
            {reg.needs_followup && <span className="registro-flag">Necessita acompanhamento</span>}
            {reg.needs_escalation && <span className="registro-flag registro-flag--escalation">Necessita escalonamento</span>}
          </div>
        </div>
      )}
    </div>
  );
}
