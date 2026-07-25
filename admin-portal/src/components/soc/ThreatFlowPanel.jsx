import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/http';

/**
 * SEC-FLOW-002 — Radar Volumétrico Global / País / IP
 *
 * Motor compartilhado. Escopos:
 *   scope='GLOBAL'   → linha GLOBAL + contribuição por países
 *   scope='ORIGIN'   → filtrado por country_code + contribuição por IPs
 *   scope='IP'       → fluxo individual de um IP
 *
 * Navegação interna progressiva: GLOBAL → ORIGIN → IP (breadcrumb).
 * Nenhum redesign do Centro de Segurança.
 */

const PEAK_COLORS  = { critical: 'var(--red)', high: 'var(--amber)', medium: 'var(--cyan)' };
const PHASE_COLORS = {
  RECONHECIMENTO: 'var(--cyan)',
  AUTENTICACAO:   'var(--amber)',
  EXPLORACAO:     'var(--orange)',
  BLOQUEIO:       'var(--green)',
  IMPACTO:        'var(--red)',
};
const SEV_COLORS = { CRITICAL: 'var(--red)', HIGH: 'var(--amber)', MEDIUM: '#b44dff', LOW: 'var(--cyan)' };

const LAYER_NAMES = {
  NGINX: 'Firewall Nginx', FAIL2BAN: 'fail2ban', UFW: 'Firewall Host (UFW)',
  CLOUDFLARE: 'Filtragem Cloudflare', RATE_LIMIT: 'Rate Limiting',
  AUTH_GUARD: 'Autenticação/Acesso', BOT_DETECT: 'Anti-Bot (Turnstile)',
  RBAC: 'RBAC/Permissões', INPUT_VAL: 'Validação de Entradas',
  INJECT_PROT: 'Anti-Injeção', TLS: 'TLS 1.3', TENANT_ISO: 'Isolamento Tenants',
  OBSERVATORY: 'SEC-01 Observatório', CORRELATION: 'SEC-02 Correlação',
  BACKUP: 'Backup Imutável', INTEGRITY: 'Controle Integridade',
  DB_PROTECT: 'Protecção BD', AUDIT: 'Auditoria/Logs',
  INCIDENT: 'Resposta Incidentes', GOVERNANCE: 'Governança',
};

const STATUS_COLORS = {
  ATUOU: 'var(--green)',
  OBSERVADA: 'var(--cyan)',
  SEM_TELEMETRIA: 'rgba(0,212,255,0.58)',
  'NÃO ACIONADA': 'rgba(0,212,255,0.58)',
  'N/A': 'rgba(0,212,255,0.58)',
};

const ESCALATION_COLORS = {
  NORMAL:                { color: 'rgba(0,212,255,0.58)', bg: 'rgba(0,212,255,0.05)' },
  ELEVATED:              { color: 'var(--cyan)',          bg: 'rgba(0,212,255,0.10)' },
  ESCALATING:            { color: 'var(--amber)',         bg: 'rgba(255,170,0,0.10)' },
  COORDINATED_SUSPECTED: { color: 'var(--orange)',        bg: 'rgba(255,107,0,0.12)' },
  CONFIRMED_INCIDENT:    { color: 'var(--red)',           bg: 'rgba(255,64,64,0.15)' },
};

const SIGNAL_LABELS = {
  VOLUME_ACCELERATION: 'Aceleração volumétrica',
  SOURCE_EXPANSION:    'Expansão de IPs',
  GEO_EXPANSION:       'Expansão geográfica',
  TEMPORAL_SYNCHRONY:  'Sincronismo temporal',
  CONCENTRATION:       'Concentração em poucos IPs',
  DISTRIBUTION:        'Distribuição entre muitos IPs',
  PHASE_SHIFT:         'Mudança de comportamento',
};

const DQ_COLORS = {
  SEM_ATIVIDADE:          'rgba(0,212,255,0.58)',
  AGREGADO_SEM_TEMPORAL:  'var(--amber)',
  TELEMETRIA_PARCIAL:     'var(--cyan)',
  TELEMETRIA_DISPONIVEL:  'var(--green)',
};

// ─── Gráfico SVG de área ──────────────────────────────────────────────────────
function ThreatFlowChart({ buckets, selectedIdx, onSelectBucket }) {
  const W = 560;
  const H = 110;
  const PAD = { top: 12, right: 12, bottom: 28, left: 38 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const counts = buckets.map((b) => b.total);
  const maxVal = Math.max(1, ...counts);
  const step = buckets.length > 1 ? innerW / (buckets.length - 1) : 0;

  const coords = buckets.map((b, i) => ({
    x: PAD.left + i * step,
    y: PAD.top + innerH - (b.total / maxVal) * innerH,
    ...b,
    idx: i,
  }));

  const lineD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaD = `${lineD} L${coords[coords.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`;

  const yTicks = [0, Math.round(maxVal / 2), maxVal];
  const xLabels = coords.filter((_, i) => i % Math.max(1, Math.floor(buckets.length / 6)) === 0 || i === coords.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
      className="soc-flow-chart-svg" role="img" aria-label="Gráfico de fluxo temporal de ameaças">
      <defs>
        <linearGradient id="sf2-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,212,255,0.28)" />
          <stop offset="100%" stopColor="rgba(0,212,255,0.02)" />
        </linearGradient>
      </defs>
      {yTicks.map((v) => {
        const gy = PAD.top + innerH - (v / maxVal) * innerH;
        return (
          <g key={v}>
            <line x1={PAD.left} y1={gy} x2={PAD.left + innerW} y2={gy}
              stroke="rgba(0,212,255,0.08)" strokeWidth="1" />
            <text x={PAD.left - 4} y={gy + 3} fontSize="9" fontWeight="600"
              fill="rgba(0,212,255,0.65)" textAnchor="end" fontFamily="var(--font-mono)">{v}</text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#sf2-area-grad)" />
      <path d={lineD} fill="none" stroke="var(--cyan)" strokeWidth="1.5" />
      {xLabels.map((c) => (
        <text key={c.idx} x={c.x} y={H - 5} fontSize="9" fontWeight="600"
          fill="rgba(0,212,255,0.72)" textAnchor="middle" fontFamily="var(--font-mono)">{c.label}</text>
      ))}
      {selectedIdx != null && coords[selectedIdx] && (
        <line x1={coords[selectedIdx].x} y1={PAD.top}
          x2={coords[selectedIdx].x} y2={PAD.top + innerH}
          stroke="rgba(0,212,255,0.35)" strokeWidth="1" strokeDasharray="3 2" />
      )}
      {coords.map((c) => {
        const isSelected = c.idx === selectedIdx;
        if (c.is_peak) {
          const color = PEAK_COLORS[c.peak_severity] || 'var(--cyan)';
          return (
            <g key={c.idx}>
              <circle cx={c.x} cy={c.y} r={isSelected ? 6 : 4} fill={color} opacity="0.9"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectBucket(isSelected ? null : c.idx)}
                role="button" aria-label={`Pico: ${c.label} — ${c.total} eventos`}
                tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelectBucket(isSelected ? null : c.idx)} />
              <circle cx={c.x} cy={c.y} r={isSelected ? 9 : 7}
                fill="none" stroke={color} strokeWidth="1" opacity="0.35" />
            </g>
          );
        }
        if (c.total > 0) {
          return (
            <circle key={c.idx} cx={c.x} cy={c.y} r={isSelected ? 4 : 2.5}
              fill={isSelected ? 'var(--cyan)' : 'rgba(0,212,255,0.45)'}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectBucket(isSelected ? null : c.idx)}
              role="button" aria-label={`${c.label}: ${c.total} eventos`}
              tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelectBucket(isSelected ? null : c.idx)} />
          );
        }
        return null;
      })}
    </svg>
  );
}

// ─── Detalhe de bucket/pico selecionado ──────────────────────────────────────
function BucketDetail({ bucket, onDrillCountry }) {
  if (!bucket) return null;
  const { label, total, by_phase, by_severity, top_events, is_peak, peak_severity, ts,
    unique_ips, active_countries, blocked, by_country } = bucket;
  const color = is_peak ? (PEAK_COLORS[peak_severity] || 'var(--cyan)') : 'var(--cyan)';
  const timeStr = ts ? new Date(ts).toISOString().slice(11, 16) + ' UTC' : label;

  const topCountries = Object.entries(by_country || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="soc-flow-detail">
      <div className="soc-flow-detail-header">
        <span className="soc-flow-detail-time" style={{ color }}>{timeStr}</span>
        {is_peak && (
          <span className="soc-flow-peak-badge" style={{ color }}>
            ● PICO {peak_severity?.toUpperCase()}
          </span>
        )}
        <span className="soc-flow-detail-total">{total} eventos</span>
      </div>

      <div className="soc-flow-detail-stats">
        {unique_ips > 0 && <span className="soc-flow-stat-chip">{unique_ips} IPs</span>}
        {active_countries > 0 && <span className="soc-flow-stat-chip">{active_countries} países</span>}
        {blocked > 0 && <span className="soc-flow-stat-chip" style={{ color: 'var(--green)' }}>{blocked} bloqueados</span>}
      </div>

      {topCountries.length > 0 && (
        <div className="soc-flow-bucket-countries">
          <span className="soc-flow-detail-sublabel">CONTRIBUIÇÃO:</span>
          {topCountries.map(([cc, cnt]) => (
            <button key={cc} type="button" className="soc-flow-country-chip-btn"
              onClick={() => onDrillCountry && onDrillCountry(cc)}
              title={`Ver fluxo de ${cc}`}>
              <span className="soc-flow-cc">{cc}</span>
              <span className="soc-flow-cc-pct">
                {total > 0 ? Math.round(cnt / total * 100) : 0}%
              </span>
            </button>
          ))}
        </div>
      )}

      {Object.keys(by_phase || {}).length > 0 && (
        <div className="soc-flow-phases-inline">
          {Object.entries(by_phase).sort(([, a], [, b]) => b - a).map(([phaseId, cnt]) => (
            <span key={phaseId} className="soc-flow-phase-chip"
              style={{ borderColor: PHASE_COLORS[phaseId] || 'var(--cyan)', color: PHASE_COLORS[phaseId] || 'var(--cyan)' }}>
              {phaseId.slice(0, 4)} {cnt}
            </span>
          ))}
        </div>
      )}

      {(top_events || []).length > 0 && (
        <div className="soc-flow-events-list">
          {top_events.map((ev, i) => (
            <div key={i} className="soc-flow-event-row">
              <span className="soc-flow-event-src">{ev.source}</span>
              <span className="soc-flow-event-type"
                style={{ color: SEV_COLORS[ev.severity] || PHASE_COLORS[ev.phase] || 'var(--cyan)' }}>
                {ev.type || ev.phase}
              </span>
              {ev.ip && <span className="soc-flow-event-ip">{ev.ip}</span>}
              {ev.country_code && ev.country_code !== '??' && (
                <span className="soc-flow-event-cc">{ev.country_code}</span>
              )}
              {ev.detail && <span className="soc-flow-event-detail">{ev.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Painel de contribuição por país ─────────────────────────────────────────
function CountryContribution({ countries, onDrillCountry }) {
  if (!countries?.length) return null;
  return (
    <div className="soc-flow-contrib-section">
      <div className="soc-flow-section-label">CONTRIBUIÇÃO POR ORIGEM ({countries.length})</div>
      <div className="soc-flow-contrib-grid">
        {countries.map((c) => (
          <button key={c.country_code} type="button" className="soc-flow-contrib-row"
            onClick={() => onDrillCountry(c.country_code)}
            title={`Ver fluxo de ${c.country || c.country_code}`}>
            <span className="soc-flow-contrib-cc">{c.country_code}</span>
            <div className="soc-flow-contrib-bar-wrap">
              <div className="soc-flow-contrib-bar"
                style={{ width: `${Math.min(100, c.pct_global)}%` }} />
            </div>
            <span className="soc-flow-contrib-total">{c.total}</span>
            <span className="soc-flow-contrib-pct">{c.pct_global}%</span>
            <span className="soc-flow-contrib-ips">{c.unique_ips} IP{c.unique_ips !== 1 ? 's' : ''}</span>
            {c.delta_pct != null && (
              <span className="soc-flow-contrib-delta"
                style={{ color: c.delta_pct > 0 ? 'var(--amber)' : 'var(--green)' }}>
                {c.delta_pct > 0 ? `+${c.delta_pct}%` : `${c.delta_pct}%`}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Painel de contribuição por IP ───────────────────────────────────────────
function IpContribution({ ips, onDrillIp, currentIp }) {
  if (!ips?.length) return null;
  const maxTotal = Math.max(1, ...ips.map((ip) => ip.total));

  return (
    <div className="soc-flow-contrib-section">
      <div className="soc-flow-section-label">CONTRIBUIÇÃO POR IP ({ips.length})</div>
      <div className="soc-flow-contrib-grid">
        {ips.map((ip) => {
          const isActive = ip.ip === currentIp;
          return (
            <button key={ip.ip} type="button"
              className={`soc-flow-contrib-row soc-flow-ip-row${isActive ? ' soc-flow-ip-row--active' : ''}`}
              onClick={() => onDrillIp(ip.ip)}
              title={`Ver fluxo do IP ${ip.ip}`}>
              <span className="soc-flow-contrib-ip">{ip.ip}</span>
              <div className="soc-flow-contrib-bar-wrap">
                <div className="soc-flow-contrib-bar"
                  style={{ width: `${Math.round(ip.total / maxTotal * 100)}%`,
                    backgroundColor: ip.blocked > 0 ? 'rgba(255,170,0,0.4)' : 'rgba(0,212,255,0.35)' }} />
              </div>
              <span className="soc-flow-contrib-total">{ip.total}</span>
              <span className="soc-flow-contrib-pct">{ip.pct_scope}%</span>
              {ip.blocked > 0 && (
                <span className="soc-flow-contrib-blocked" style={{ color: 'var(--amber)' }}>
                  {ip.blocked}blq
                </span>
              )}
              <span className="soc-flow-contrib-last"
                title={ip.last_seen}>
                {new Date(ip.last_seen).toISOString().slice(11, 16)} UTC
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sinais de escalada ───────────────────────────────────────────────────────
function EscalationPanel({ signals }) {
  if (!signals) return null;
  const { status, reason_codes, coordination_index, detail } = signals;
  const style = ESCALATION_COLORS[status] || ESCALATION_COLORS.NORMAL;

  if (status === 'NORMAL' && !reason_codes?.length) return null;

  return (
    <div className="soc-flow-escalation" style={{ borderColor: style.color, background: style.bg }}>
      <div className="soc-flow-escalation-header">
        <span className="soc-flow-escalation-label" style={{ color: style.color }}>
          ◆ {status.replace(/_/g, ' ')}
        </span>
        <span className="soc-flow-escalation-idx" style={{ color: style.color }}>
          ÍNDICE {coordination_index}
        </span>
      </div>
      {detail && <p className="soc-flow-escalation-detail">{detail}</p>}
      {reason_codes?.length > 0 && (
        <div className="soc-flow-signal-chips">
          {reason_codes.map((code) => (
            <span key={code} className="soc-flow-signal-chip" style={{ borderColor: style.color, color: style.color }}>
              {SIGNAL_LABELS[code] || code}
            </span>
          ))}
        </div>
      )}
      <p className="soc-flow-escalation-note">
        Índice de coordenação operacional explicável (0–100). Baseado em: aceleração volumétrica,
        expansão de IPs/países, sincronismo temporal, mudança de fase.
        Não representa probabilidade de ataque.
      </p>
    </div>
  );
}

// ─── Indicador de qualidade dos dados ────────────────────────────────────────
function DataQualityBadge({ dq }) {
  if (!dq) return null;
  const color = DQ_COLORS[dq.state] || 'rgba(0,212,255,0.58)';
  return (
    <div className="soc-flow-dq">
      <span className="soc-flow-dq-label" style={{ color }}>{dq.label}</span>
      {dq.note && <span className="soc-flow-dq-note">{dq.note}</span>}
    </div>
  );
}

// ─── Timeline de fases ────────────────────────────────────────────────────────
function PhaseTimeline({ phases, selectedPhase, onSelectPhase }) {
  if (!phases?.length) return null;
  return (
    <div className="soc-flow-phase-timeline">
      {phases.map((p) => {
        const color = PHASE_COLORS[p.id] || 'var(--cyan)';
        const isActive = selectedPhase === p.id;
        return (
          <button key={p.id} type="button"
            className={`soc-flow-phase-node${isActive ? ' soc-flow-phase-node--active' : ''}`}
            style={{ '--phase-color': color }}
            onClick={() => onSelectPhase(isActive ? null : p.id)}
            aria-pressed={isActive} title={p.description}>
            <div className="soc-flow-phase-dot" />
            <div className="soc-flow-phase-meta">
              <span className="soc-flow-phase-label" style={{ color }}>{p.label}</span>
              <span className="soc-flow-phase-time">{p.first_label}</span>
              <span className="soc-flow-phase-count">{p.total_events} ev.</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Correlação com camadas ───────────────────────────────────────────────────
function DefenseLayerCorrelation({ correlation, activePhase, phases }) {
  const relevantIds = activePhase
    ? new Set((phases?.find((p) => p.id === activePhase)?.layers) || [])
    : new Set(correlation.map((c) => c.layer_id));
  const items = correlation.filter((c) => relevantIds.has(c.layer_id));
  if (!items.length) return null;
  const activePhaseColor = activePhase ? (PHASE_COLORS[activePhase] || 'var(--sf-text-secondary, rgba(0,212,255,0.72))') : null;
  return (
    <div className="soc-flow-defense">
      <div className="soc-flow-defense-title">
        CAMADAS DE DEFESA
        {activePhase && (
          <span style={{ fontWeight: 400, color: activePhaseColor }}> — {activePhase}</span>
        )}
      </div>
      <div className="soc-flow-defense-grid">
        {items.map((c) => (
          <div key={c.layer_id} className="soc-flow-defense-item">
            <span className="soc-flow-defense-status" style={{ color: STATUS_COLORS[c.status] || 'var(--cyan)' }}>
              {c.status}
            </span>
            <span className="soc-flow-defense-name">{LAYER_NAMES[c.layer_id] || c.layer_id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Resumo operacional ────────────────────────────────────────────────────────
function FlowSummary({ summary }) {
  if (!summary) return null;
  return (
    <div className="soc-flow-summary">
      <div className="soc-flow-summary-grid">
        {summary.total_events > 0 && (
          <div className="soc-flow-summary-item">
            <span className="soc-flow-summary-val">{summary.total_events}</span>
            <span className="soc-flow-summary-key">eventos</span>
          </div>
        )}
        {summary.unique_ips > 0 && (
          <div className="soc-flow-summary-item">
            <span className="soc-flow-summary-val">{summary.unique_ips}</span>
            <span className="soc-flow-summary-key">IPs únicos</span>
          </div>
        )}
        {summary.unique_countries > 0 && (
          <div className="soc-flow-summary-item">
            <span className="soc-flow-summary-val">{summary.unique_countries}</span>
            <span className="soc-flow-summary-key">países</span>
          </div>
        )}
        {summary.critical_high_events > 0 && (
          <div className="soc-flow-summary-item">
            <span className="soc-flow-summary-val" style={{ color: 'var(--amber)' }}>{summary.critical_high_events}</span>
            <span className="soc-flow-summary-key">críticos/altos</span>
          </div>
        )}
        {summary.blocked_events > 0 && (
          <div className="soc-flow-summary-item">
            <span className="soc-flow-summary-val" style={{ color: 'var(--green)' }}>{summary.blocked_events}</span>
            <span className="soc-flow-summary-key">bloqueados</span>
          </div>
        )}
        {summary.peak_buckets > 0 && (
          <div className="soc-flow-summary-item">
            <span className="soc-flow-summary-val" style={{ color: 'var(--red)' }}>{summary.peak_buckets}</span>
            <span className="soc-flow-summary-key">picos</span>
          </div>
        )}
      </div>
      {summary.sources_used?.length > 0 && (
        <div className="soc-flow-summary-sources">
          Fontes: {summary.sources_used.join(', ')}
        </div>
      )}
    </div>
  );
}

// ─── Proveniência ─────────────────────────────────────────────────────────────
function Provenance({ prov, genAt }) {
  if (!prov) return null;
  return (
    <details className="soc-flow-prov">
      <summary className="soc-flow-prov-summary">Proveniência e limitações</summary>
      <div className="soc-flow-prov-body">
        {prov.sources && (
          <div>
            <p className="soc-flow-prov-title">FONTES:</p>
            {Object.entries(prov.sources).map(([src, info]) => (
              <p key={src}><strong>{src}</strong>: {info.available != null ? `${info.available} disponíveis — ` : ''}{info.note}</p>
            ))}
          </div>
        )}
        {prov.deduplication && (
          <p>Deduplicação: {prov.deduplication.raw_events} brutos → {prov.deduplication.after_dedup} ({prov.deduplication.removed} removidos). {prov.deduplication.strategy}</p>
        )}
        {prov.bucketing && (
          <p>Bucketing: {prov.bucketing.bucket_ms / 60000}min por bucket. {prov.bucketing.algorithm}</p>
        )}
        {prov.coordination_formula && <p>Índice de coordenação: {prov.coordination_formula}</p>}
        {prov.limitations?.length > 0 && (
          <div>
            <p className="soc-flow-prov-title">LIMITAÇÕES:</p>
            {prov.limitations.map((l, i) => <p key={i}>• {l}</p>)}
          </div>
        )}
        {genAt && <p>Gerado: {new Date(genAt).toLocaleString('pt-BR')}</p>}
      </div>
    </details>
  );
}

// ─── Breadcrumb de navegação ──────────────────────────────────────────────────
function NavBreadcrumb({ navStack, onNavigate }) {
  if (navStack.length <= 1) return null;
  return (
    <div className="soc-flow-breadcrumb" aria-label="Navegação de escopo">
      {navStack.map((item, idx) => {
        const isLast = idx === navStack.length - 1;
        const label = item.scope === 'GLOBAL' ? 'GLOBAL'
          : item.scope === 'ORIGIN' ? `ORIGEM: ${item.scopeId}`
          : `IP: ${item.scopeId}`;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="soc-flow-breadcrumb-sep">›</span>}
            {isLast
              ? <span className="soc-flow-breadcrumb-current">{label}</span>
              : (
                <button type="button" className="soc-flow-breadcrumb-btn"
                  onClick={() => onNavigate(idx)}>
                  {label}
                </button>
              )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Seletor de janela temporal ───────────────────────────────────────────────
function WindowSelector({ value, onChange }) {
  const opts = [{ v: '1h', label: '1H' }, { v: '6h', label: '6H' }, { v: '24h', label: '24H' }];
  return (
    <div className="soc-flow-window-sel" aria-label="Janela temporal">
      {opts.map((o) => (
        <button key={o.v} type="button"
          className={`soc-flow-window-btn${value === o.v ? ' soc-flow-window-btn--active' : ''}`}
          onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Painel principal ─────────────────────────────────────────────────────────
export default function ThreatFlowPanel({ scope: propScope = 'GLOBAL', scopeId: propScopeId = null, onClose, compact = false }) {
  // Pilha de navegação interna: [{scope, scopeId}, ...]
  const [navStack, setNavStack] = useState([{ scope: propScope, scopeId: propScopeId }]);
  const [windowParam, setWindowParam] = useState('24h');
  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const abortRef = useRef(null);

  const current = navStack[navStack.length - 1];

  // Quando os props externos mudam, reinicializar a pilha
  useEffect(() => {
    setNavStack([{ scope: propScope, scopeId: propScopeId }]);
    setSelectedIdx(null);
    setSelectedPhase(null);
  }, [propScope, propScopeId]);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setErr(null);
    setSelectedIdx(null);
    setSelectedPhase(null);
    try {
      const params = new URLSearchParams({ scope: current.scope, window: windowParam });
      if (current.scopeId) params.set('scopeId', current.scopeId);
      const body = await api(`/security-dashboard/threat-flow?${params}`, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      setFlowData(body?.data || null);
    } catch (e) {
      if (ctrl.signal.aborted || e?.name === 'AbortError') return;
      setErr('Falha ao carregar fluxo de ameaças. Verifique a sessão e tente novamente.');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [current.scope, current.scopeId, windowParam]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const handleSelectBucket = useCallback((idx) => {
    setSelectedIdx(idx);
    if (idx == null) return;
    const b = flowData?.buckets?.[idx];
    if (b?.by_phase) {
      const dominant = Object.entries(b.by_phase).sort(([, a], [, b]) => b - a)[0]?.[0];
      if (dominant) setSelectedPhase(dominant);
    }
  }, [flowData]);

  // Drill down para uma origem (país)
  const handleDrillCountry = useCallback((cc) => {
    setNavStack((prev) => [...prev, { scope: 'ORIGIN', scopeId: cc }]);
  }, []);

  // Drill down para um IP
  const handleDrillIp = useCallback((ip) => {
    setNavStack((prev) => {
      // Se já estamos em IP, substituir; se em ORIGIN, adicionar
      if (prev[prev.length - 1].scope === 'IP') {
        return [...prev.slice(0, -1), { scope: 'IP', scopeId: ip }];
      }
      return [...prev, { scope: 'IP', scopeId: ip }];
    });
  }, []);

  // Navegar para nível específico da pilha
  const handleNavigate = useCallback((idx) => {
    setNavStack((prev) => prev.slice(0, idx + 1));
  }, []);

  const selectedBucket = selectedIdx != null ? flowData?.buckets?.[selectedIdx] : null;
  const isGlobal = current.scope === 'GLOBAL';
  const isOrigin = current.scope === 'ORIGIN';
  const isIp = current.scope === 'IP';

  const headerLabel = isGlobal
    ? 'CENTRO DE SEGURANÇA › RADAR VOLUMÉTRICO GLOBAL'
    : isOrigin
    ? `FLUXO DA ORIGEM — ${current.scopeId}`
    : `FLUXO DO IP — ${current.scopeId}`;

  const badge = isGlobal ? 'SEC-FLOW-002' : `SEC-FLOW-002 / ${current.scopeId}`;

  const dq = flowData?.data_quality;
  const hasActivity = (flowData?.buckets || []).some((b) => b.total > 0);

  return (
    <div className={`soc-flow-panel${compact ? ' soc-flow-panel--compact' : ''}`}>
      {/* Cabeçalho */}
      <div className="soc-flow-header">
        <div className="soc-flow-header-left">
          <span className="soc-flow-badge">{badge}</span>
          <span className="soc-flow-title">{headerLabel}</span>
          <NavBreadcrumb navStack={navStack} onNavigate={handleNavigate} />
        </div>
        <div className="soc-flow-header-right">
          {!compact && (
            <WindowSelector value={windowParam} onChange={(w) => { setWindowParam(w); }} />
          )}
          {flowData && (
            <div className="soc-flow-meta-chips">
              <span className="soc-flow-chip soc-flow-chip--live">
                <span className="soc-live-dot" style={{ marginRight: 4 }} aria-hidden="true" />
                ATUALIZAÇÃO CONTÍNUA
              </span>
              {flowData.generated_at && (
                <span className="soc-flow-chip">
                  {new Date(flowData.generated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <span className="soc-flow-chip">JANELA {(windowParam || '24h').toUpperCase()}</span>
            </div>
          )}
          {!compact && onClose && (
            <button type="button" className="soc-flow-close" onClick={onClose}
              aria-label="Fechar painel de fluxo de ameaças">✕</button>
          )}
        </div>
      </div>

      {/* Corpo */}
      {loading && (
        <div className="soc-flow-loading">
          <span className="soc-live-dot" style={{ marginRight: 8 }} aria-hidden="true" />
          Carregando telemetria volumétrica…
        </div>
      )}

      {err && !loading && (
        <div className="soc-flow-error">
          <span style={{ color: 'var(--red)' }}>ERRO —</span> {err}
          <button type="button" className="btn btn-ghost"
            style={{ marginLeft: 12, fontSize: '0.72rem' }} onClick={load}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !err && flowData && (
        <div className="soc-flow-body">
          {/* Sinal de escalada — destaque no topo quando relevante */}
          {flowData.escalation_signals?.status !== 'NORMAL' && (
            <EscalationPanel signals={flowData.escalation_signals} />
          )}

          {/* Qualidade dos dados */}
          <DataQualityBadge dq={dq} />

          {/* Legenda */}
          <div className="soc-flow-legend">
            <span className="soc-flow-legend-item soc-flow-legend-item--total">● Atividade total</span>
            <span className="soc-flow-legend-item" style={{ color: PEAK_COLORS.critical }}>● Pico crítico</span>
            <span className="soc-flow-legend-item" style={{ color: PEAK_COLORS.high }}>● Pico elevado</span>
            <span className="soc-flow-legend-item" style={{ color: PEAK_COLORS.medium }}>● Pico médio</span>
          </div>

          {/* Gráfico principal */}
          {hasActivity ? (
            <ThreatFlowChart
              buckets={flowData.buckets}
              selectedIdx={selectedIdx}
              onSelectBucket={handleSelectBucket}
            />
          ) : (
            <div className="soc-flow-empty">
              <span style={{ color: DQ_COLORS[dq?.state] || 'rgba(0,212,255,0.58)' }}>
                {dq?.label || 'SEM ATIVIDADE TEMPORAL'}
              </span>
              {dq?.note && <p className="soc-flow-empty-note">{dq.note}</p>}
            </div>
          )}

          {/* Detalhe do bucket selecionado */}
          {selectedBucket && (
            <BucketDetail
              bucket={selectedBucket}
              onDrillCountry={!isIp ? handleDrillCountry : null}
            />
          )}

          {/* Contribuição por país — apenas scope GLOBAL */}
          {isGlobal && (flowData.country_contribution || []).length > 0 && (
            <CountryContribution
              countries={flowData.country_contribution}
              onDrillCountry={handleDrillCountry}
            />
          )}

          {/* Contribuição por IP — scope ORIGIN ou IP */}
          {(isOrigin || isIp) && (flowData.ip_contribution || []).length > 0 && (
            <IpContribution
              ips={flowData.ip_contribution}
              onDrillIp={handleDrillIp}
              currentIp={isIp ? current.scopeId : null}
            />
          )}

          {/* Linha de fases */}
          {(flowData.phases || []).length > 0 && (
            <>
              <div className="soc-flow-section-label">CORRELAÇÃO TEMPORAL DE COMPORTAMENTO</div>
              <PhaseTimeline
                phases={flowData.phases}
                selectedPhase={selectedPhase}
                onSelectPhase={setSelectedPhase}
              />
            </>
          )}

          {/* Camadas de defesa */}
          {(flowData.defense_correlation || []).length > 0 && (
            <DefenseLayerCorrelation
              correlation={flowData.defense_correlation}
              activePhase={selectedPhase}
              phases={flowData.phases}
            />
          )}

          {/* Resumo */}
          <FlowSummary summary={flowData.summary} />

          {/* Proveniência */}
          <Provenance prov={flowData.provenance} genAt={flowData.generated_at} />
        </div>
      )}

      {!loading && !err && !flowData && (
        <div className="soc-flow-empty">
          <span>TELEMETRIA NÃO DISPONÍVEL</span>
        </div>
      )}
    </div>
  );
}
