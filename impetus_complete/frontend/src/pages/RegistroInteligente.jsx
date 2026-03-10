/**
 * REGISTRO INTELIGENTE
 * Módulo para todos os usuários - registrar rotina operacional com assistência da IA
 */
import React, { useState, useEffect } from 'react';
import {
  FileEdit, Sparkles, CheckCircle2, AlertTriangle, Clock, Lightbulb,
  Factory, Wrench, Shield, Package, Zap, ChevronDown, ChevronUp
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

export default function RegistroInteligente() {
  const notify = useNotification();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      setLoadingList(true);
      const r = await intelligentRegistration.list({ limit: 30 });
      setRegistrations(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar registros');
    } finally {
      setLoadingList(false);
    }
  };

  const handleShortcut = (shortcut) => {
    const templates = {
      atividades: 'Executei as seguintes atividades: ',
      problemas: 'Encontrei os seguintes problemas: ',
      pendencias: 'Ficaram pendentes: ',
      atualizacoes: 'Atualizações do dia: ',
      sugestoes: 'Sugiro que: ',
      ocorrencias: 'Ocorrências: ',
      producao: 'Sobre produção: ',
      manutencao: 'Sobre manutenção: ',
      qualidade: 'Sobre qualidade: ',
      seguranca: 'Sobre segurança: '
    };
    const prefix = templates[shortcut.id] || '';
    setText(prev => prev ? `${prev}\n${prefix}` : prefix);
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 10) {
      notify.error('Digite pelo menos uma frase descrevendo o que aconteceu.');
      return;
    }

    try {
      setLoading(true);
      await intelligentRegistration.create(trimmed);
      notify.success('Registro feito com sucesso! A IA organizou e classificou suas informações.');
      setText('');
      loadRegistrations();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="registro-inteligente-page">
        <div className="registro-header">
          <div className="registro-header-left">
            <div className="registro-icon">
              <FileEdit size={28} />
            </div>
            <div>
              <h1 className="registro-title">Registro Inteligente</h1>
              <p className="registro-subtitle">Registre seu dia de trabalho com apoio da IA</p>
            </div>
          </div>
        </div>

        <div className="registro-main">
          <div className="registro-card">
            <p className="registro-instruction">
              Registre aqui tudo o que você achar importante sobre seu dia de trabalho. Conte o que foi feito,
              o que aconteceu, problemas encontrados, atualizações, pendências, observações e qualquer informação relevante.
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
              rows={6}
              disabled={loading}
            />

            <div className="registro-actions">
              <button
                className="btn-registrar-ia"
                onClick={handleSubmit}
                disabled={loading || !text.trim()}
              >
                <Sparkles size={20} />
                {loading ? 'Processando com IA...' : 'Registrar com IA'}
              </button>
            </div>
          </div>

          <div className="registro-history">
            <h2 className="registro-history-title">Meus registros</h2>
            {loadingList ? (
              <div className="registro-loading">Carregando...</div>
            ) : registrations.length === 0 ? (
              <div className="registro-empty">Nenhum registro ainda. Comece registrando seu dia!</div>
            ) : (
              <div className="registro-list">
                {registrations.map((reg) => (
                  <RegistroCard
                    key={reg.id}
                    reg={reg}
                    expanded={expandedId === reg.id}
                    onToggle={() => setExpandedId(expandedId === reg.id ? null : reg.id)}
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

function RegistroCard({ reg, expanded, onToggle }) {
  const dateStr = reg.registration_date
    ? new Date(reg.registration_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const timeStr = reg.created_at
    ? new Date(reg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`registro-card-item registro-card-item--${PRIORITY_COLORS[reg.priority] || 'normal'}`}>
      <div className="registro-card-header" onClick={onToggle}>
        <div className="registro-card-meta">
          <span className="registro-card-date">{dateStr}</span>
          <span className="registro-card-time">{timeStr}</span>
          {reg.main_category && (
            <span className="registro-card-category">{reg.main_category}</span>
          )}
          {reg.priority && reg.priority !== 'normal' && (
            <span className={`registro-badge registro-badge--${PRIORITY_COLORS[reg.priority]}`}>
              {PRIORITY_LABELS[reg.priority]}
            </span>
          )}
        </div>
        <p className="registro-card-summary">{reg.ai_summary || reg.original_text?.slice(0, 100)}</p>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>

      {expanded && (
        <div className="registro-card-detail">
          <div className="registro-original">
            <strong>Texto original:</strong>
            <p>{reg.original_text}</p>
          </div>
          {(reg.activities_detected?.length || reg.problems_detected?.length || reg.pendencies_detected?.length) > 0 && (
            <div className="registro-extracted">
              {reg.activities_detected?.length > 0 && (
                <div><strong>Atividades:</strong> {reg.activities_detected.join('; ')}</div>
              )}
              {reg.problems_detected?.length > 0 && (
                <div><strong>Problemas:</strong> {reg.problems_detected.join('; ')}</div>
              )}
              {reg.pendencies_detected?.length > 0 && (
                <div><strong>Pendências:</strong> {reg.pendencies_detected.join('; ')}</div>
              )}
            </div>
          )}
          {(reg.line_identified || reg.machine_identified || reg.sector_identified) && (
            <div className="registro-context">
              {reg.line_identified && <span>Linha: {reg.line_identified}</span>}
              {reg.machine_identified && <span>Máquina: {reg.machine_identified}</span>}
              {reg.sector_identified && <span>Setor: {reg.sector_identified}</span>}
            </div>
          )}
          {reg.needs_followup && <span className="registro-flag">Necessita acompanhamento</span>}
          {reg.needs_escalation && <span className="registro-flag registro-flag--escalation">Necessita escalonamento</span>}
        </div>
      )}
    </div>
  );
}
