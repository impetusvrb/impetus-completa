/**
 * Painel de saúde do motor cognitivo unificado (GET /api/internal/unified-health).
 * Widget lateral fixo — não substitui conteúdo do dashboard operacional.
 * internal_admin: visão completa | demais perfis autorizados: visão executiva.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import './SystemHealthPanel.css';

const POLL_MS = 30000;

const HEALTH_ROLES = new Set(['internal_admin', 'ceo', 'diretor', 'gerente', 'coordenador']);

/** Mesma regra de visibilidade do painel — reutilizável no menu lateral. */
export function userCanAccessSystemHealth(user) {
  const role = user?.role != null ? String(user.role).trim().toLowerCase() : '';
  return HEALTH_ROLES.has(role);
}

/** Alinhado ao contrato do backend: good | warning | critical */
const statusPresentation = {
  good: { color: '#22c55e', label: 'OK' },
  healthy: { color: '#22c55e', label: 'OK' },
  warning: { color: '#f59e0b', label: 'Atenção' },
  critical: { color: '#ef4444', label: 'Crítico' },
  unknown: { color: '#94a3b8', label: '—' }
};

function normalizeStatusKey(raw) {
  const s = raw != null ? String(raw).trim().toLowerCase() : '';
  if (s === 'good' || s === 'healthy') return 'good';
  if (s === 'warning') return 'warning';
  if (s === 'critical') return 'critical';
  return 'unknown';
}

function readAccessSnapshot() {
  try {
    const token = localStorage.getItem('impetus_token');
    const s = localStorage.getItem('impetus_user');
    const u = s ? JSON.parse(s) : null;
    const role = u?.role != null ? String(u.role).trim().toLowerCase() : '';
    return {
      token,
      role,
      companyId: u?.company_id != null ? u.company_id : null,
      allowed: !!(token && role && HEALTH_ROLES.has(role))
    };
  } catch {
    return { token: null, role: '', companyId: null, allowed: false };
  }
}

function parseUser() {
  try {
    const s = localStorage.getItem('impetus_user');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function formatLatencyBlock(al) {
  if (!al || typeof al !== 'object') return '—';
  const g = Number(al.gpt);
  const c = Number(al.cognitive);
  const parts = [];
  if (Number.isFinite(g) && g > 0) parts.push(`GPT ${Math.round(g)} ms`);
  if (Number.isFinite(c) && c > 0) parts.push(`Cogn. ${Math.round(c)} ms`);
  return parts.length ? parts.join(' · ') : '—';
}

function learningLabel(v) {
  const x = v != null ? String(v).toLowerCase() : '';
  const map = {
    stable: 'Estável',
    acceptable: 'Aceitável',
    attention: 'Requer atenção',
    unknown: 'Em coleta'
  };
  return map[x] || v || '—';
}

function StatusRow({ presentation }) {
  return (
    <div className="impetus-sys-health__row">
      <span>Status</span>
      <span
        className="impetus-sys-health__badge"
        style={{
          background: `${presentation.color}22`,
          color: presentation.color,
          border: `1px solid ${presentation.color}44`
        }}
      >
        {presentation.label}
      </span>
    </div>
  );
}

function StabilityBlock({ presentation, stability }) {
  return (
    <div>
      <div className="impetus-sys-health__row">
        <span>Estabilidade</span>
        <span>{Math.round(stability * 100)}%</span>
      </div>
      <div
        className="impetus-sys-health__bar"
        role="progressbar"
        aria-valuenow={Math.round(stability * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="impetus-sys-health__bar-fill"
          style={{
            width: `${Math.round(stability * 100)}%`,
            background: presentation.color
          }}
        />
      </div>
    </div>
  );
}

/** Visão executiva — sem dados internos de auditoria ou latência detalhada */
function renderExecutive(ctx) {
  const { presentation, stability, payload, fallbackPct } = ctx;
  return (
    <>
      <StatusRow presentation={presentation} />
      <StabilityBlock presentation={presentation} stability={stability} />
      <div className="impetus-sys-health__row">
        <span>Aprendizado</span>
        <span>{learningLabel(payload?.health?.learning_status)}</span>
      </div>
      <div className="impetus-sys-health__row">
        <span>Taxa de fallback</span>
        <span>{fallbackPct != null ? `${fallbackPct}%` : '—'}</span>
      </div>
    </>
  );
}

/** Visão completa — internal_admin */
function renderFull(ctx) {
  const { presentation, stability, payload, fallbackPct } = ctx;
  const sis = payload?.system_influence_summary;
  const influenceActive =
    sis &&
    sis.samples > 0 &&
    ((sis.priority_override_rate || 0) > 0.02 || (sis.high_risk_rate || 0) > 0.02);

  return (
    <>
      {influenceActive && (
        <div className="impetus-sys-health__influence" role="status">
          <div>
            <span className="impetus-sys-health__influence-pulse" aria-hidden />
            Sistema sugerindo intervenção
          </div>
          <span className="impetus-sys-health__influence-meta">
            Influência ativa: prioridade elevada {Math.round((sis.priority_override_rate || 0) * 100)}% ·
            risco alto {Math.round((sis.high_risk_rate || 0) * 100)}% (janela recente)
          </span>
        </div>
      )}
      <StatusRow presentation={presentation} />
      <StabilityBlock presentation={presentation} stability={stability} />
      <div className="impetus-sys-health__row">
        <span>Aprendizado</span>
        <span>{learningLabel(payload?.health?.learning_status)}</span>
      </div>
      <div className="impetus-sys-health__row">
        <span>Taxa de fallback</span>
        <span>{fallbackPct != null ? `${fallbackPct}%` : '—'}</span>
      </div>
      <div className="impetus-sys-health__row">
        <span>Latência média</span>
        <span style={{ fontSize: '11px', fontWeight: 500 }}>{formatLatencyBlock(payload?.metrics?.avg_latency)}</span>
      </div>
      <div className="impetus-sys-health__row">
        <span>Auditorias (janela)</span>
        <span>{Array.isArray(payload?.recent_audits) ? payload.recent_audits.length : '—'}</span>
      </div>
    </>
  );
}

export default function SystemHealthPanel({ embedded = false }) {
  const location = useLocation();
  const [access, setAccess] = useState(() => readAccessSnapshot());
  const [payload, setPayload] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const user = useMemo(() => parseUser(), [location.pathname]);

  useEffect(() => {
    setAccess(readAccessSnapshot());
  }, [location.pathname]);

  useEffect(() => {
    const onStorage = () => setAccess(readAccessSnapshot());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const fetchHealth = useCallback(async () => {
    const snap = readAccessSnapshot();
    setAccess(snap);
    if (!snap.allowed) return;

    try {
      const params = snap.companyId != null && snap.companyId !== '' ? { company_id: snap.companyId } : {};
      const { data } = await api.get('/internal/unified-health', { params, timeout: 12000 });
      if (data && data.ok) {
        setPayload(data);
      }
    } catch {
      /* falha de API: não bloquear UI nem mostrar detalhe técnico */
    }
  }, []);

  useEffect(() => {
    if (!access.allowed) return undefined;
    void fetchHealth();
    const id = setInterval(() => {
      void fetchHealth();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [access.allowed, fetchHealth]);

  const presentation = useMemo(() => {
    if (!payload?.health) return { key: 'unknown', color: statusPresentation.unknown.color, label: statusPresentation.unknown.label };
    const h = payload.health;
    const adminFull = String(user?.role ?? '').trim().toLowerCase() === 'internal_admin';
    const statusRaw = adminFull ? h.system_health ?? h.status : h.status ?? h.system_health;
    const key = normalizeStatusKey(statusRaw);
    const preset = statusPresentation[key] || statusPresentation.unknown;
    return { key, ...preset };
  }, [payload, user?.role]);

  const stability = useMemo(() => {
    const v = Number(payload?.health?.stability_score);
    if (!Number.isFinite(v)) return 0;
    return Math.min(1, Math.max(0, v));
  }, [payload]);

  if (!access.allowed) return null;

  const fr = Number(payload?.metrics?.fallback_rate);
  const fallbackPct = Number.isFinite(fr) ? Math.round(fr * 1000) / 10 : null;

  const ctx = { presentation, stability, payload, fallbackPct };

  const showBody = embedded || expanded;

  return (
    <aside
      className={`impetus-sys-health${embedded ? ' impetus-sys-health--embedded' : ' impetus-sys-health--lateral'}${embedded || expanded ? '' : ' impetus-sys-health--collapsed'}`}
      aria-label="Saúde do sistema cognitivo"
    >
      {!embedded && (
        <div className="impetus-sys-health__head">
          <span className="impetus-sys-health__dot" style={{ color: presentation.color, background: presentation.color }} />
          <span className="impetus-sys-health__title">Saúde cognitiva</span>
          <button
            type="button"
            className="impetus-sys-health__toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? 'Recolher' : 'Expandir'}
          </button>
        </div>
      )}

      {showBody && (
        <div className="impetus-sys-health__body">
          {(() => {
            const role = user?.role;
            if (String(role ?? '').trim().toLowerCase() === 'internal_admin') return renderFull(ctx);
            return renderExecutive(ctx);
          })()}
          {!payload && <p className="impetus-sys-health__muted">A aguardar dados…</p>}
        </div>
      )}
    </aside>
  );
}
