import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCognitivePulseContext } from './CognitivePulseContext';
import CognitiveDataStateBadge from './CognitiveDataStateBadge';
import './cognitiveCompactPresence.css';

const AXIS_LABELS = {
  executive: 'Executivo',
  hr: 'Pessoas',
  quality: 'Qualidade',
  maintenance: 'Manutenção',
  environmental: 'Ambiental',
  operations: 'Operações',
  production: 'Produção',
  finance: 'Financeiro',
  planning: 'Planejamento'
};

function structuralLine(pulse) {
  const org = pulse?.organizational_context || {};
  const audience = pulse?.cognitive_audience || {};
  const parts = [];
  if (org.cargo) parts.push(org.cargo);
  if (org.departamento) parts.push(org.departamento);
  const axis = AXIS_LABELS[audience.primary_axis] || audience.primary_axis;
  if (axis) parts.push(`eixo ${axis}`);
  return parts.length ? parts.join(' · ') : null;
}

/**
 * Faixa cognitiva leve em telas fora do Centro de Comando (/app).
 * variant=manuia → banner compacto colapsável (UX-MANUIA-001).
 */
export default function CognitiveCompactPresence({ variant = 'default' }) {
  const { pulse, loading } = useCognitivePulseContext();
  const [expanded, setExpanded] = useState(false);
  const isManuia = variant === 'manuia';

  if (loading && !pulse) return null;

  const core = pulse?.cognitive_core;
  const mode = pulse?.operational_mode || 'normal';
  const dataState = pulse?.data_state;
  const isEmpty = dataState === 'empty' || dataState === 'tenant_empty';
  const identity = structuralLine(pulse);
  const summary =
    pulse?.cross_analysis?.summary ||
    (isEmpty ? pulse?.operational_narrative?.headline : null);

  const dataLabel =
    dataState === 'real' || dataState === 'live'
      ? 'Dados reais'
      : isEmpty
        ? 'Sem dados'
        : 'Dados filtrados';

  if (isManuia) {
    return (
      <div
        className={`cog-compact-presence cog-compact-presence--manuia ${expanded ? 'cog-compact-presence--manuia-open' : ''}`}
        role="status"
        aria-live="polite"
      >
        <button
          type="button"
          className="cog-compact-presence__head cog-compact-presence__head--manuia"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span className="cog-compact-presence__pulse" aria-hidden />
          <span className="cog-compact-presence__brand">Cognitive Core</span>
          <span className="cog-compact-presence__manuia-data">{dataLabel}</span>
          <Link
            to="/app"
            className="cog-compact-presence__link cog-compact-presence__link--manuia"
            onClick={(e) => e.stopPropagation()}
          >
            Ecossistema &gt;
          </Link>
        </button>
        {expanded && (
          <div className="cog-compact-presence__manuia-detail">
            {dataState && <CognitiveDataStateBadge dataState={dataState} className="cog-compact-presence__state" />}
            <span className={`cog-compact-presence__mode cog-compact-presence__mode--${mode}`}>
              {mode.replace(/_/g, ' ')}
            </span>
            {identity && <p className="cog-compact-presence__identity">{identity}</p>}
            {summary && <p className="cog-compact-presence__summary">{summary}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="cog-compact-presence" role="status" aria-live="polite">
      <div className="cog-compact-presence__head">
        <span className="cog-compact-presence__brand">{core?.name || 'COGNITIVE CORE'}</span>
        <span className={`cog-compact-presence__pulse ${isEmpty ? 'cog-compact-presence__pulse--idle' : ''}`} aria-hidden />
        {dataState && <CognitiveDataStateBadge dataState={dataState} className="cog-compact-presence__state" />}
        <span className={`cog-compact-presence__mode cog-compact-presence__mode--${mode}`}>
          {mode.replace(/_/g, ' ')}
        </span>
      </div>
      {identity && (
        <p className="cog-compact-presence__identity" title="Identidade — Base Estrutural">
          {identity}
        </p>
      )}
      {summary && <p className="cog-compact-presence__summary">{summary}</p>}
      <Link to="/app" className="cog-compact-presence__link">
        Abrir ecossistema cognitivo
      </Link>
    </div>
  );
}
