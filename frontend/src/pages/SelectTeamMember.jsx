/**
 * Seleção do operador ativo (login coletivo — chão de fábrica)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, CheckCircle } from 'lucide-react';
import { factoryTeam } from '../services/api';
import './SelectTeamMember.css';

export default function SelectTeamMember() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const r = await factoryTeam.getContext();
      const d = r.data;
      if (!d.is_factory_team) {
        navigate('/app', { replace: true });
        return;
      }
      setCtx(d);
      if (!d.needs_selection && d.active_member) {
        navigate('/app', { replace: true });
      }
    } catch (e) {
      setError(e.apiMessage || 'Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pickMember = async (memberId) => {
    try {
      setSubmitting(true);
      setError('');
      await factoryTeam.setMember(memberId);
      try {
        const raw = localStorage.getItem('impetus_user');
        const u = raw ? JSON.parse(raw) : {};
        u.needs_factory_member_selection = false;
        localStorage.setItem('impetus_user', JSON.stringify(u));
      } catch (_) {}
      navigate('/app', { replace: true });
    } catch (e) {
      setError(e.apiMessage || 'Não foi possível confirmar o membro');
    } finally {
      setSubmitting(false);
    }
  };

  const useSuggested = async () => {
    try {
      setSubmitting(true);
      setError('');
      await factoryTeam.useSuggested();
      try {
        const raw = localStorage.getItem('impetus_user');
        const u = raw ? JSON.parse(raw) : {};
        u.needs_factory_member_selection = false;
        localStorage.setItem('impetus_user', JSON.stringify(u));
      } catch (_) {}
      navigate('/app', { replace: true });
    } catch (e) {
      setError(e.apiMessage || 'Sem sugestão automática para este horário');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="select-team-member-page">
        <p>Carregando equipe…</p>
      </div>
    );
  }

  if (!ctx?.is_factory_team) return null;

  const members = ctx.members || [];
  const suggested = ctx.suggested_member;

  return (
    <div className="select-team-member-page">
      <div className="select-team-card">
        <div className="select-team-header">
          <Users size={40} className="select-team-icon" />
          <h1>Quem está operando agora?</h1>
          <p className="select-team-sub">
            Conta da equipe <strong>{ctx.team?.name}</strong>. Selecione o membro para registrar ações e relatórios em seu nome.
          </p>
        </div>

        {error && <div className="select-team-error">{error}</div>}

        {suggested && (
          <div className="select-team-suggested">
            <Clock size={18} />
            <span>
              Sugestão pelo horário: <strong>{suggested.display_name}</strong>
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={submitting}
              onClick={useSuggested}
            >
              Usar sugestão
            </button>
          </div>
        )}

        <ul className="select-team-list">
          {members.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="select-team-item"
                disabled={submitting}
                onClick={() => pickMember(m.id)}
              >
                <CheckCircle size={18} className="select-team-check" />
                <div>
                  <div className="select-team-name">{m.display_name}</div>
                  {(m.shift_label || m.schedule_start) && (
                    <div className="select-team-meta">
                      {m.shift_label}
                      {m.schedule_start && m.schedule_end && (
                        <span>
                          {' '}
                          · {String(m.schedule_start).slice(0, 5)}–{String(m.schedule_end).slice(0, 5)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>

        {members.length === 0 && (
          <p className="select-team-empty">Nenhum membro ativo cadastrado. Peça ao administrador para cadastrar a equipe.</p>
        )}
      </div>
    </div>
  );
}
