/**
 * Barra fixa: conta coletiva — operador ativo e atalho para trocar
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, RefreshCw } from 'lucide-react';
import { factoryTeam } from '../services/api';
import './FactoryTeamOperatorBar.css';

function mergeFactoryMemberStorage(activeMember, teamName) {
  try {
    const raw = localStorage.getItem('impetus_user');
    const u = raw ? JSON.parse(raw) : {};
    if (activeMember) {
      u.factory_active_member = { id: activeMember.id, display_name: activeMember.display_name };
    } else {
      delete u.factory_active_member;
    }
    if (teamName) u.factory_team_name = teamName;
    localStorage.setItem('impetus_user', JSON.stringify(u));
  } catch (_) {}
}

export default function FactoryTeamOperatorBar() {
  const location = useLocation();
  const [ctx, setCtx] = useState(null);

  const load = useCallback(async () => {
    try {
      const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
      if (!u.is_factory_team_account) {
        setCtx(null);
        return;
      }
      const r = await factoryTeam.getContext();
      const d = r.data;
      if (!d?.is_factory_team) {
        setCtx(null);
        return;
      }
      setCtx(d);
      if (d.active_member && d.team?.name) {
        mergeFactoryMemberStorage(d.active_member, d.team.name);
      }
    } catch {
      setCtx(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, location.pathname]);

  if (location.pathname === '/app/equipe-operacional') return null;

  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    if (!u.is_factory_team_account) return null;
  } catch {
    return null;
  }

  if (!ctx?.is_factory_team || !ctx.active_member) return null;

  const teamName = ctx.team?.name || '';

  return (
    <div className="factory-operator-bar" role="status">
      <Users size={16} aria-hidden className="factory-operator-bar__icon" />
      <span className="factory-operator-bar__text">
        <span className="factory-operator-bar__label">Operando:</span>{' '}
        <strong>{ctx.active_member.display_name}</strong>
        {teamName ? (
          <>
            {' '}
            · Equipe <strong>{teamName}</strong>
          </>
        ) : null}
      </span>
      <Link to="/app/equipe-operacional" className="factory-operator-bar__link">
        <RefreshCw size={14} aria-hidden />
        Trocar operador
      </Link>
    </div>
  );
}
