/**
 * Verificação do operador (login coletivo — matrícula + senha individual)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { factoryTeam } from '../services/api';
import ImpetusPulseModal from '../features/pulse/ImpetusPulseModal';
import './SelectTeamMember.css';

const GATE_KEY = 'impetus_factory_operator_gate';

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
  const [matricula, setMatricula] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [pulseEval, setPulseEval] = useState(null);
  const [pulseBlocking, setPulseBlocking] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      try {
        if (!sessionStorage.getItem(GATE_KEY)) {
          await factoryTeam.clearActiveMember();
        }
      } catch (_) {
        /* continua — contexto ainda pode pedir seleção */
      }
      const r = await factoryTeam.getContext();
      const d = r.data;
      if (!d.is_factory_team) {
        navigate('/app', { replace: true });
        return;
      }
      setCtx(d);
      if (d.active_member && d.team?.name) {
        mergeUserStorage({
          factory_active_member: {
            id: d.active_member.id,
            display_name: d.active_member.display_name,
            matricula: d.active_member.matricula
          },
          factory_team_name: d.team.name
        });
      }
      if (!d.needs_selection && d.active_member && sessionStorage.getItem(GATE_KEY)) {
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

  const goDashboardAfterGate = () => {
    sessionStorage.setItem(GATE_KEY, '1');
    mergeUserStorage({ needs_factory_member_selection: false });
    navigate('/app', { replace: true });
  };

  const verify = async (e) => {
    e?.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      const r = await factoryTeam.verifyOperator({
        matricula: matricula.trim(),
        access_password: accessPassword
      });
      const am = r.data?.active_member;
      if (am && ctx?.team?.name) {
        mergeUserStorage({
          needs_factory_member_selection: false,
          factory_active_member: {
            id: am.id,
            display_name: am.display_name,
            matricula: am.matricula
          },
          factory_team_name: ctx.team.name
        });
      }
      const pulse = r.data?.pulse;
      if (pulse?.require_completion && pulse.evaluation?.id) {
        setPulseEval(pulse.evaluation);
        setPulseBlocking(true);
 return;
      }
      goDashboardAfterGate();
    } catch (err) {
      setError(err.apiMessage || err.response?.data?.error || 'Não foi possível verificar');
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

  return (
    <div className="select-team-member-page">
      <ImpetusPulseModal
        evaluation={pulseEval}
        isOpen={pulseBlocking && !!pulseEval?.id}
        onClose={() => {}}
        onSubmitted={() => {
          setPulseBlocking(false);
          setPulseEval(null);
          goDashboardAfterGate();
        }}
        blocking
      />
      <div className="select-team-card">
        <div className="select-team-header">
          <Users size={40} className="select-team-icon" />
          <h1>Verificação de operador</h1>
          <p className="select-team-sub">
            Conta da equipe <strong>{ctx.team?.name}</strong>. Informe a matrícula e a senha de acesso individual
            fornecidas pelo administrador para registrar seu acesso ao painel coletivo.
          </p>
        </div>

        {error && <div className="select-team-error">{error}</div>}

        <form className="select-team-verify-form" onSubmit={verify}>
          <label className="select-team-field">
            <span>Matrícula</span>
            <input
              type="text"
              name="matricula"
              autoComplete="username"
              value={matricula}
              onChange={(ev) => setMatricula(ev.target.value)}
              disabled={submitting}
              required
            />
          </label>
          <label className="select-team-field">
            <span>Senha de acesso individual</span>
            <input
              type="password"
              name="access_password"
              autoComplete="current-password"
              value={accessPassword}
              onChange={(ev) => setAccessPassword(ev.target.value)}
              disabled={submitting}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Verificando…' : 'Confirmar e continuar'}
          </button>
        </form>

        <p className="select-team-hint">
          Ao fechar o separador do navegador, será necessário autenticar novamente com matrícula e senha antes de ver o
          painel.
        </p>
      </div>
    </div>
  );
}
