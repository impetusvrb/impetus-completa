/**
 * Topo premium do Centro de Comando — contexto operacional + status IA + relógio.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Brain, Building2, MessageSquare, Shield, User } from 'lucide-react';

function hierarchyLabel(level) {
  const n = Number(level);
  if (n === 0) return 'CEO';
  if (n === 1) return 'Diretor';
  if (n === 2) return 'Gerente';
  if (n === 3) return 'Coordenador';
  if (n === 4) return 'Supervisor';
  return 'Operacional';
}

export default function CentroComandoCommandHeader({
  user,
  titulo,
  subtitulo,
  dashboardCtx,
  hrDashboard = false,
  liveSurfaceActive = false
}) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const clock = useMemo(
    () =>
      now.toLocaleString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
    [now]
  );

  const sp = user?.structural_profile || {};
  const cargo =
    sp.cargo_estrutural?.nome || sp.cargo || user?.company_role_name || user?.job_title || user?.cargo || '—';
  const setor = sp.departamento || user?.department_resolved_name || user?.department || user?.area || '—';
  const funcaoLabel = sp.funcao_label || (user?.role ? String(user.role).replace(/_/g, ' ') : '—');
  const unidade = user?.plant_name || user?.unit_name || user?.company_name || null;
  const nivel = hierarchyLabel(user?.hierarchy_level ?? 5);
  const engine = dashboardCtx?.engine || dashboardCtx?.source || 'contextual';
  const iaOnline = dashboardCtx?.assistente_ia?.ativo !== false;

  return (
    <header className="cc-command-header">
      <div className="cc-command-header__scanline" aria-hidden />
      <div className="cc-command-header__main">
        <div className="cc-command-header__identity">
          <div className="cc-command-header__avatar" aria-hidden>
            <User size={22} />
          </div>
          <div>
            <p className="cc-command-header__eyebrow">CENTRO DE COMANDO INDUSTRIAL COGNITIVO</p>
            <h1 className="cc-command-header__title">{titulo}</h1>
            <p className="cc-command-header__subtitle">{subtitulo}</p>
          </div>
        </div>
        <div className="cc-command-header__clock">
          <span className="cc-command-header__clock-label">TEMPO OPERACIONAL</span>
          <time className="cc-command-header__clock-val">{clock}</time>
        </div>
      </div>

      <div className="cc-command-header__meta">
        <div className="cc-command-header__chip">
          <User size={14} />
          <span>{user?.name || 'Operador'}</span>
        </div>
        <div className="cc-command-header__chip">
          <Shield size={14} />
          <span>{cargo}</span>
        </div>
        <div className="cc-command-header__chip">
          <span className="cc-command-header__chip-key">FUNÇÃO</span>
          <span>{funcaoLabel}</span>
        </div>
        <div className="cc-command-header__chip">
          <Building2 size={14} />
          <span>{setor}</span>
        </div>
        <div className="cc-command-header__chip cc-command-header__chip--level">
          <span className="cc-command-header__chip-key">NÍVEL</span>
          <span>{nivel}</span>
        </div>
        {unidade && (
          <div className="cc-command-header__chip">
            <Building2 size={14} />
            <span>{unidade}</span>
          </div>
        )}
        <div
          className={`cc-command-header__status cc-command-header__status--${iaOnline ? 'ok' : 'warn'}`}
        >
          <Brain size={14} />
          <span className="cc-command-header__status-dot" />
          <span>IA {iaOnline ? 'ATIVA' : 'DEGRADADA'}</span>
          <span className="cc-command-header__status-meta">{engine}</span>
        </div>
        <div
          className={`cc-command-header__status cc-command-header__status--${liveSurfaceActive ? 'live' : 'ok'}`}
        >
          <Activity size={14} />
          <span className="cc-command-header__status-dot" />
          <span>{liveSurfaceActive ? 'SUPERFÍCIE AO VIVO' : hrDashboard ? 'PAINEL RH' : 'OPERAÇÃO ESTÁVEL'}</span>
        </div>
        <button
          type="button"
          className="cc-command-header__ia-btn"
          onClick={() => navigate('/app/chatbot')}
          title="Abrir Impetus IA"
        >
          <MessageSquare size={14} />
          <span>IMPETUS IA</span>
        </button>
        <button
          type="button"
          className="cc-command-header__ia-btn cc-command-header__ia-btn--ghost"
          onClick={() => navigate('/chat')}
          title="Abrir Chat Impetus"
        >
          <MessageSquare size={14} />
          <span>CHAT</span>
        </button>
      </div>
    </header>
  );
}
