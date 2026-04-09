/**
 * Seleção do operador ativo (login coletivo — chão de fábrica)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, CheckCircle } from 'lucide-react';
import { factoryTeam } from '../services/api';
import './SelectTeamMember.css';

function mergeUserStorage(partial) {
  try {
    const raw = localStorage.getItem('impetus_user');
    const u = raw ? JSON.parse(raw) : {};
    Object.assign(u, partial);
    localStorage.setItem('impetus_user', JSON.stringify(u));
  } catch (_) {}
}

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
      if (d.active_member && d.team?.name) {
        mergeUserStorage({
          factory_active_member: { id: d.active_member.id, display_name: d.active_member.display_name },
          factory_team_name: d.team.name
        });
      }
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
      const r = await factoryTeam.setMember(memberId);
      const am = r.data?.active_member;
      if (am && ctx?.team?.name) {
        mergeUserStorage({
          needs_factory_member_selection: false,
          factory_active_member: { id: am.id, display_name: am.display_name },
          factory_team_name: ctx.team.name
        });
      } else {
        mergeUserStorage({ needs_factory_member_selection: false });
      }
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
      const r = await factoryTeam.useSuggested();
      const am = r.data?.active_member;
      if (am && ctx?.team?.name) {
        mergeUserStorage({
          needs_factory_member_selection: false,
          factory_active_member: { id: am.id, display_name: am.display_name },
          factory_team_name: ctx.team.name
        });
      } else {
        mergeUserStorage({ needs_factory_member_selection: false });
      }
      navigate('/app', { replace: true });
    } catch (e) {
      setError(e.apiMessage || 'Sem sugestão automática para este horário');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmContinue = async () => {
    try {
      setSubmitting(true);
      setError('');
      await factoryTeam.confirmContinue();
      mergeUserStorage({ needs_factory_member_selection: false });
      navigate('/app', { replace: true });
    } catch (e) {
      setError(e.apiMessage || 'Não foi possível confirmar');
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
  const rev = ctx.needs_revalidation;
  const quick = ctx.quick_confirm_eligible;

  return (
    <div className="select-team-member-page">
      <div className="select-team-card">
        <div className="select-team-header">
          <Users size={40} className="select-team-icon" />
          <h1>{rev ? 'Reconfirmar quem está operando' : 'Quem está operando agora?'}</h1>
          <p className="select-team-sub">
            Conta da equipe <strong>{ctx.team?.name}</strong>.{' '}
            {rev
              ? 'Por política de segurança ou mudança de turno, confirme o operador ativo.'
              : 'Selecione o membro para registrar ações e relatórios em seu nome.'}
          </p>
        </div>

        {error && <div className="select-team-error">{error}</div>}

        {quick && ctx.active_member && (
          <div className="select-team-suggested select-team-quick">
            <CheckCircle size={18} />
            <span>
              Continuar como <strong>{ctx.active_member.display_name}</strong> (revalidação após {ctx.revalidation_hours || 4}h)
            </span>
            <button type="button" className="btn btn-primary" disabled={submitting} onClick={confirmContinue}>
              Continuar
            </button>
          </div>
        )}

        {suggested && !quick && (
          <div className="select-team-suggested">
            <Clock size={18} />
            <span>
              Sugestão pelo horário: <strong>{suggested.display_name}</strong>
            </span>
            <button type="button" className="btn btn-secondary" disabled={submitting} onClick={useSuggested}>
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
