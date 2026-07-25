/**
 * SEC-VISUAL-INTELLIGENCE-001 — Painel de Análise Visual de Evidências de Segurança
 *
 * Referência visual: IMAGEM 2 (Simulação de Ataques — IMPETUS Comunica IA)
 * Dados: 100% reais e rastreáveis do IMPETUS. Nenhum valor fictício.
 *
 * Áreas:
 *   A — Cabeçalho analítico
 *   B — Fases / vetores observados (5 cards horizontais)
 *   C — Como o IMPETUS respondeu (cards verdes)
 *   D — Linha do tempo
 *   E — Camadas de proteção (painel lateral)
 *   F — Resumo da análise
 *   G — Conclusão executiva
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/http';
import ThreatFlowPanel from './soc/ThreatFlowPanel';
import { formatSocApiError } from '../utils/socApiError';

// ── Helpers visuais ──────────────────────────────────────────────────────────

function statusColor(status) {
  switch (status) {
    case 'ATUOU':          return 'var(--green)';
    case 'OBSERVADA':      return 'var(--cyan)';
    case 'SEM_TELEMETRIA': return 'var(--text-tertiary, #4a6080)';
    case 'NAO_APLICAVEL':  return 'var(--text-tertiary, #4a6080)';
    default:               return 'var(--amber)';
  }
}

function statusLabel(status) {
  switch (status) {
    case 'ATUOU':          return 'ATUOU';
    case 'OBSERVADA':      return 'OBSERVADA';
    case 'SEM_TELEMETRIA': return 'SEM TELEMETRIA';
    case 'NAO_APLICAVEL':  return 'N/A';
    default:               return 'INDETERMINADO';
  }
}

function vectorColor(classification) {
  switch (classification) {
    case 'COMPROVADO':    return 'var(--green)';
    case 'OBSERVADO':     return 'var(--red)';
    case 'INFERIDO':      return 'var(--amber)';
    case 'NÃO_DETECTADO': return 'var(--text-tertiary, #4a6080)';
    case 'NÃO_ACIONADO':  return 'var(--text-tertiary, #4a6080)';
    default:              return 'var(--text-tertiary, #4a6080)';
  }
}

function resultAccent(color) {
  switch (color) {
    case 'red':   return 'var(--red)';
    case 'green': return 'var(--green)';
    case 'amber': return 'var(--amber)';
    default:      return 'var(--cyan)';
  }
}

function severityColor(sev) {
  switch (String(sev || '').toUpperCase()) {
    case 'CRITICAL': return 'var(--red)';
    case 'HIGH':     return 'var(--red)';
    case 'MEDIUM':   return 'var(--amber)';
    default:         return 'var(--cyan)';
  }
}

function fmt(n) {
  if (n == null) return '—';
  if (typeof n === 'number' && Number.isNaN(n)) return '—';
  if (n === 0) return '0';
  return n.toLocaleString('pt-BR');
}

/** Campo canónico do contrato security_intelligence_v1 (renomeado na API). */
function summaryThreatWatchAlerts(summary) {
  if (!summary || typeof summary !== 'object') return null;
  for (const key of ['threat_watch_alerts_in_index', 'threat_watch_alerts', 'threat_watch_alerts_displayed']) {
    const raw = summary[key];
    if (raw == null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function summaryCriticalEvents(summary) {
  if (!summary || typeof summary !== 'object') return null;
  const n = Number(summary.critical_events_count);
  return Number.isFinite(n) ? n : null;
}

/** Soma semântica: null = componente ausente no payload, não zero medido. */
function sumSummaryMetrics(...values) {
  let sum = 0;
  let known = false;
  for (const v of values) {
    if (v == null) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    sum += n;
    known = true;
  }
  return known ? sum : null;
}

function fmtDetectedEvents(summary) {
  const total = sumSummaryMetrics(
    summaryThreatWatchAlerts(summary),
    summaryCriticalEvents(summary)
  );
  return total == null ? '—' : fmt(total);
}

function fmtTs(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'UTC', hour12: false
    }) + ' UTC';
  } catch { return ts; }
}

function fmtTsShort(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString('pt-BR', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'UTC', hour12: false
    });
  } catch { return ts; }
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function SectionTitle({ children, accent = 'var(--cyan)' }) {
  return (
    <div style={{
      fontSize: '0.72rem', fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.14em', color: accent,
      borderBottom: `1px solid ${accent}33`, paddingBottom: 5, marginBottom: 10
    }}>
      {children}
    </div>
  );
}

function MonoLabel({ children, color }) {
  return (
    <span style={{ fontFamily: 'var(--font-mono, "Share Tech Mono")', fontSize: '0.72rem', color: color || 'var(--text-secondary)' }}>
      {children}
    </span>
  );
}

function DataNum({ value, color, size = '1.4rem' }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono, "Share Tech Mono")',
      fontSize: size, fontWeight: 700,
      color: color || 'var(--cyan)',
      lineHeight: 1
    }}>
      {fmt(value)}
    </span>
  );
}

function ProvenanceBadge({ classification }) {
  const colors = {
    OBSERVADO: 'var(--cyan)',
    CORRELACIONADO: 'var(--amber)',
    INFERIDO: 'var(--amber)',
    'NÃO_DETERMINADO': 'var(--text-tertiary)'
  };
  return (
    <span style={{
      fontSize: '0.6rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
      color: colors[classification] || 'var(--text-tertiary)',
      borderRadius: 2, padding: '1px 4px',
      border: `1px solid ${colors[classification] || 'var(--text-tertiary)'}44`
    }}>
      {classification}
    </span>
  );
}

// ── Área A — Cabeçalho ───────────────────────────────────────────────────────
function HeaderArea({ intel, onClose, onRefresh, loading }) {
  const { selection, summary, time_window, result, generated_at, dashboard_cache_age_sec } = intel;

  return (
    <div style={{
      padding: '14px 18px 12px',
      borderBottom: '1px solid var(--border-subtle, rgba(0,212,255,0.15))',
      background: 'rgba(0,0,0,0.25)'
    }}>
      {/* Linha superior: breadcrumb + controles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
            CENTRO DE SEGURANÇA &gt; ANÁLISE DE ORIGEM
          </span>
          <span style={{
            fontSize: '0.58rem', fontFamily: 'var(--font-mono)', padding: '2px 6px',
            border: '1px solid rgba(0,212,255,0.3)', borderRadius: 2, color: 'var(--cyan)'
          }}>
            SEC-VIS-001
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.62rem', padding: '3px 10px',
              background: 'transparent', border: '1px solid rgba(0,212,255,0.35)',
              borderRadius: 3, color: 'var(--cyan)', cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? '⟳ carregando…' : '⟳ atualizar'}
          </button>
          <button
            onClick={onClose}
            aria-label="Fechar painel de análise"
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem', padding: '3px 10px',
              background: 'transparent', border: '1px solid rgba(255,64,64,0.3)',
              borderRadius: 3, color: 'var(--red)', cursor: 'pointer'
            }}
          >
            ✕ fechar
          </button>
        </div>
      </div>

      {/* País e stats */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{
            fontSize: 'clamp(1rem, 3vw, 1.5rem)', fontFamily: 'var(--font-display, Rajdhani)',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', lineHeight: 1.1
          }}>
            {selection.is_unknown ? '?? ORIGEM NÃO DETERMINADA' : selection.label}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
            <MonoLabel color="var(--text-tertiary)">Código: <strong style={{ color: 'var(--cyan)' }}>{selection.key}</strong></MonoLabel>
            <MonoLabel color="var(--text-tertiary)">
              Janela: <strong style={{ color: '#fff' }}>{time_window.unit}</strong>
            </MonoLabel>
            <MonoLabel color="var(--text-tertiary)">
              Cache: <strong style={{ color: dashboard_cache_age_sec > 25 ? 'var(--amber)' : 'var(--green)' }}>
                {dashboard_cache_age_sec != null ? `${dashboard_cache_age_sec}s atrás` : 'live'}
              </strong>
            </MonoLabel>
            <MonoLabel color="var(--text-tertiary)">
              Gerado: <strong style={{ color: '#fff' }}>{fmtTs(generated_at)}</strong>
            </MonoLabel>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {[
            { label: 'Índice Agregado¹', value: summary.total_weighted_events, color: 'var(--red)',
              hint: '¹ Soma ponderada: nginx×1 + bloqueado×2 + alerta×1' },
            { label: 'IPs Únicos', value: summary.unique_ips, color: 'var(--amber)' },
            { label: 'IPs Bloqueados', value: summary.blocked_ips_count, color: 'var(--green)' },
            { label: 'Alertas Threat-Watch', value: summaryThreatWatchAlerts(summary), color: 'var(--cyan)' }
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }} title={s.hint || ''}>
              <DataNum value={s.value} color={s.color} size="1.6rem" />
              <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 2, letterSpacing: '0.04em' }}>
                {s.label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resultado */}
      <div style={{
        marginTop: 10, padding: '6px 12px', borderRadius: 3,
        border: `1px solid ${resultAccent(result.color)}44`,
        background: `${resultAccent(result.color)}11`,
        display: 'inline-block'
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 700,
          letterSpacing: '0.06em', color: resultAccent(result.color)
        }}>
          ● {result.label}
        </span>
      </div>
    </div>
  );
}

// ── Área B — Vetores de Ataque ────────────────────────────────────────────────
function VectorsArea({ vectors }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div>
      <SectionTitle>Fases e Vetores Observados</SectionTitle>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 8
      }}>
        {(vectors || []).map((v, i) => {
          const active = v.classification === 'OBSERVADO' || v.classification === 'COMPROVADO';
          const accent = vectorColor(v.classification);
          const isOpen = expanded === v.id;

          return (
            <div
              key={v.id}
              role="button"
              tabIndex={0}
              onClick={() => setExpanded(isOpen ? null : v.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded(isOpen ? null : v.id)}
              aria-expanded={isOpen}
              aria-label={`${i + 1}. ${v.label}: ${v.count} eventos — ${v.classification}`}
              style={{
                border: `1px solid ${accent}55`,
                borderRadius: 4, padding: '10px 12px',
                background: active ? `${accent}0d` : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'border-color 0.2s',
                outline: 'none'
              }}
            >
              <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                {String(i + 1).padStart(2, '0')}. {v.id}
              </div>
              <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', marginBottom: 6, lineHeight: 1.2 }}>
                {v.label}
              </div>
              <DataNum value={v.count} color={accent} size="1.6rem" />
              <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 2 }}>eventos</div>
              {v.ips_count > 0 && (
                <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: accent, marginTop: 4 }}>
                  {v.ips_count} IP(s)
                </div>
              )}
              <div style={{ marginTop: 6 }}>
                <ProvenanceBadge classification={v.classification} />
              </div>

              {/* Expansão */}
              {isOpen && v.evidence_preview?.length > 0 && (
                <div style={{
                  marginTop: 8, paddingTop: 8,
                  borderTop: `1px solid ${accent}33`,
                  fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>Evidências:</div>
                  {v.evidence_preview.map((ev, j) => (
                    <div key={j} style={{ marginBottom: 2, wordBreak: 'break-all', color: accent }}>
                      › {ev}
                    </div>
                  ))}
                  <div style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>Fonte: {v.source}</div>
                </div>
              )}
              {isOpen && (!v.evidence_preview || v.evidence_preview.length === 0) && (
                <div style={{
                  marginTop: 8, paddingTop: 8,
                  borderTop: `1px solid ${accent}33`,
                  fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)'
                }}>
                  Evidência detalhada não disponível para esta fase nesta origem.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Área C — Como o IMPETUS respondeu ────────────────────────────────────────
function ResponseArea({ intel }) {
  const { blocking_activity, summary, attack_vectors } = intel;

  const blockingV = (attack_vectors || []).find((v) => v.id === 'BLOQUEIO');

  const twAlerts = summaryThreatWatchAlerts(summary);
  const critEvents = summaryCriticalEvents(summary);
  const detectedTotal = sumSummaryMetrics(twAlerts, critEvents);

  const cards = [
    {
      id: 'detect',
      icon: '◎',
      title: 'Detecção',
      value: fmtDetectedEvents(summary),
      unit: detectedTotal == null ? 'telemetria indisponível' : 'eventos detectados',
      detail: detectedTotal == null
        ? 'threat-watch + observatory — campo ausente no payload'
        : 'threat-watch + observatory',
      active: detectedTotal != null && detectedTotal > 0,
      color: 'var(--green)'
    },
    {
      id: 'block',
      icon: '⊘',
      title: 'Bloqueio Automático',
      value: fmt(blocking_activity?.total ?? 0),
      unit: 'IPs banidos',
      detail: `fail2ban: ${blocking_activity?.fail2ban?.count ?? 0} · UFW: ${blocking_activity?.ufw?.count ?? 0}`,
      active: (blocking_activity?.total ?? 0) > 0,
      color: 'var(--green)'
    },
    {
      id: 'nginx',
      icon: '⬡',
      title: 'Protecção de Rotas',
      value: fmt(summary.nginx_suspicious_hits),
      unit: 'hits suspeitos nginx',
      detail: 'classificação por status code + path probe',
      active: summary.nginx_suspicious_hits > 0,
      color: 'var(--cyan)'
    },
    {
      id: 'auth',
      icon: '⌬',
      title: 'Tentativas de Autenticação',
      value: fmt(summary.auth_attempts),
      unit: 'tentativas',
      detail: 'auth guard + admin_logs',
      active: summary.auth_attempts > 0,
      color: summary.auth_attempts > 0 ? 'var(--amber)' : 'var(--green)'
    },
    {
      id: 'audit',
      icon: '▣',
      title: 'Monitoramento e Evidências',
      value: fmt(sumSummaryMetrics(twAlerts, critEvents, summary.blocked_ips_count)),
      unit: 'registos auditáveis',
      detail: 'threat-watch + admin_logs + fail2ban',
      active: sumSummaryMetrics(twAlerts, critEvents, summary.blocked_ips_count) != null,
      color: 'var(--cyan)'
    }
  ];

  return (
    <div>
      <SectionTitle accent="var(--green)">Como o IMPETUS Respondeu</SectionTitle>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 8
      }}>
        {cards.map((c) => (
          <div key={c.id} style={{
            border: `1px solid ${c.active ? c.color + '55' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 4, padding: '10px 12px',
            background: c.active ? `${c.color}0d` : 'rgba(255,255,255,0.02)'
          }}>
            <div style={{ fontSize: '1.1rem', color: c.active ? c.color : 'var(--text-tertiary)', marginBottom: 4 }}>{c.icon}</div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', marginBottom: 6, lineHeight: 1.2 }}>
              {c.title}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: c.active ? c.color : 'var(--text-tertiary)', lineHeight: 1 }}>
              {c.value}
            </div>
            <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 2 }}>{c.unit}</div>
            <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 5, lineHeight: 1.3 }}>{c.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Área D — Linha do Tempo ───────────────────────────────────────────────────
function TimelineArea({ timeline }) {
  const [activeMarker, setActiveMarker] = useState(null);

  if (!timeline || timeline.length === 0) {
    return (
      <div>
        <SectionTitle>Linha do Tempo</SectionTitle>
        <div style={{
          border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 14,
          fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)'
        }}>
          TELEMETRIA NÃO INSTRUMENTADA — Sem eventos com timestamp rastreável desta origem na janela actual.<br />
          <span style={{ fontSize: '0.65rem' }}>
            Os hits nginx individuais não possuem timestamps disponíveis no nível de agregação.<br />
            Timestamps disponíveis apenas a partir de alertas threat-watch.
          </span>
        </div>
      </div>
    );
  }

  const milestoneColor = {
    first_occurrence: 'var(--amber)',
    peak_activity:    'var(--red)',
    last_occurrence:  'var(--cyan)',
    first_block:      'var(--green)'
  };

  return (
    <div>
      <SectionTitle>Linha do Tempo</SectionTitle>
      <div style={{
        border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '14px 12px',
        overflowX: 'auto'
      }}>
        {/* Linha */}
        <div style={{ position: 'relative', minHeight: 60, paddingBottom: 8 }}>
          <div style={{
            position: 'absolute', top: 20, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, var(--cyan)33, transparent)'
          }} />

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', gap: 8, minWidth: timeline.length * 120
          }}>
            {timeline.map((ev, i) => {
              const color = milestoneColor[ev.milestone] || 'var(--cyan)';
              const isActive = activeMarker === i;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <button
                    onClick={() => setActiveMarker(isActive ? null : i)}
                    aria-label={`Marco: ${ev.label_pt || ev.label} — ${fmtTs(ev.ts)}`}
                    style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: color, border: `2px solid ${color}`,
                      boxShadow: isActive ? `0 0 10px ${color}` : 'none',
                      cursor: 'pointer', flexShrink: 0, marginBottom: 6,
                      transition: 'box-shadow 0.2s'
                    }}
                  />
                  <div style={{
                    fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: color,
                    textAlign: 'center', lineHeight: 1.3, maxWidth: 100
                  }}>
                    {fmtTsShort(ev.ts)}
                  </div>
                  <div style={{
                    fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
                    textAlign: 'center', marginTop: 2, maxWidth: 100, lineHeight: 1.2
                  }}>
                    {ev.label_pt || ev.milestone}
                  </div>

                  {/* Popup ao clicar */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: '110%', zIndex: 10,
                      background: 'var(--bg-panel, #0f1a28)',
                      border: `1px solid ${color}55`, borderRadius: 4, padding: '8px 10px',
                      minWidth: 200, fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)', boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
                    }}>
                      <div style={{ color, marginBottom: 4, fontWeight: 700 }}>{ev.label_pt}</div>
                      <div>Tipo: <span style={{ color: '#fff' }}>{ev.label}</span></div>
                      <div>Timestamp: <span style={{ color: '#fff' }}>{fmtTs(ev.ts)}</span></div>
                      {ev.severity && <div>Severidade: <span style={{ color: severityColor(ev.severity) }}>{ev.severity}</span></div>}
                      {ev.ip && <div>IP: <span style={{ color: '#fff' }}>{ev.ip}</span></div>}
                      {ev.detail && <div style={{ marginTop: 4, color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>Detalhe: {ev.detail}</div>}
                      <div style={{ marginTop: 4, color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>Fonte: {ev.source}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          marginTop: 6, fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)'
        }}>
          Clique num marco para ver evidências. Fonte: threat-watch log — timestamps em UTC.
        </div>
      </div>
    </div>
  );
}

// ── Área E — Camadas de Protecção ─────────────────────────────────────────────
function ProtectionLayersPanel({ layers }) {
  const [activeLayer, setActiveLayer] = useState(null);

  const actedCount     = (layers || []).filter((l) => l.status === 'ATUOU').length;
  const observedCount  = (layers || []).filter((l) => l.status === 'OBSERVADA').length;
  const noDataCount    = (layers || []).filter((l) => l.status === 'SEM_TELEMETRIA').length;
  const naCount        = (layers || []).filter((l) => l.status === 'NAO_APLICAVEL').length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SectionTitle>Camadas de Protecção — IMPETUS</SectionTitle>

      {/* Sumário de camadas */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {[
          { label: 'ATUOU', count: actedCount, color: 'var(--green)' },
          { label: 'OBSERVADA', count: observedCount, color: 'var(--cyan)' },
          { label: 'SEM TELEM.', count: noDataCount, color: 'var(--text-tertiary)' },
          { label: 'N/A', count: naCount, color: 'var(--text-tertiary)' }
        ].map((s) => (
          <div key={s.label} style={{
            fontSize: '0.6rem', fontFamily: 'var(--font-mono)', padding: '2px 6px',
            border: `1px solid ${s.color}44`, borderRadius: 2, color: s.color
          }}>
            {s.count} {s.label}
          </div>
        ))}
      </div>

      {/* Lista de camadas */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {(layers || []).map((l, i) => {
          const color = statusColor(l.status);
          const isActive = activeLayer === l.id;
          return (
            <div
              key={l.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveLayer(isActive ? null : l.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveLayer(isActive ? null : l.id)}
              aria-expanded={isActive}
              aria-label={`Camada ${i + 1}: ${l.name} — ${l.status}`}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer', outline: 'none'
              }}
            >
              <div style={{
                minWidth: 20, fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
                color: 'var(--text-tertiary)', paddingTop: 1
              }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#ddd', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
                    {l.name}
                  </span>
                  <span style={{
                    fontSize: '0.58rem', fontFamily: 'var(--font-mono)',
                    color, fontWeight: 700, letterSpacing: '0.04em',
                    marginLeft: 8, whiteSpace: 'nowrap'
                  }}>
                    {statusLabel(l.status)}
                  </span>
                </div>
                {isActive && (
                  <div style={{
                    marginTop: 5, fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
                    color: 'var(--text-tertiary)', lineHeight: 1.4, wordBreak: 'break-word'
                  }}>
                    {l.evidence}
                    <div style={{ marginTop: 3, fontSize: '0.58rem', color: 'var(--text-tertiary)' }}>
                      Telemetria: {l.telemetry}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Área F — Resumo da Análise ────────────────────────────────────────────────
function SummaryCard({ intel }) {
  const { summary, time_window, selection, provenance, targeted_surfaces } = intel;

  // Decomposição explícita do índice agregado ponderado
  // Fórmula: nginx_hits×1 + blocked_ips×2 + threat_watch_alerts×1
  const nginxHits  = summary.nginx_suspicious_hits ?? 0;
  const blockedCnt = summary.blocked_ips_count     ?? 0;
  const twAlerts   = summaryThreatWatchAlerts(summary) ?? 0;
  const computed   = nginxHits + (blockedCnt * 2) + twAlerts;

  const rows = [
    { label: 'Janela analisada', value: `${time_window.nginx_lines_scanned} linhas nginx / ${time_window.threat_lines_scanned} linhas threat-watch`, mono: true },
    {
      label: 'Índice agregado ponderado (badge)',
      value: `${fmt(summary.total_weighted_events)} — nginx ${fmt(nginxHits)}×1 + bloqueados ${fmt(blockedCnt)}×2 + alertas ${fmt(twAlerts)}×1 = ${fmt(computed)}`,
      accent: 'var(--red)', mono: true
    },
    { label: 'IPs únicos', value: fmt(summary.unique_ips), accent: 'var(--amber)' },
    { label: 'IPs bloqueados (fail2ban/UFW)', value: fmt(summary.blocked_ips_count), accent: 'var(--green)' },
    { label: 'Hits suspeitos nginx', value: fmt(summary.nginx_suspicious_hits), accent: 'var(--cyan)' },
    { label: 'Alertas threat-watch', value: fmt(summaryThreatWatchAlerts(summary)), accent: 'var(--amber)' },
    { label: 'Tentativas de autenticação', value: fmt(summary.auth_attempts), accent: summary.auth_attempts > 0 ? 'var(--amber)' : 'var(--text-tertiary)' },
    { label: 'Eventos críticos', value: fmt(summary.critical_events_count), accent: summary.critical_events_count > 0 ? 'var(--red)' : 'var(--text-tertiary)' },
    { label: 'Endpoints visados (detectados)', value: fmt(targeted_surfaces?.length ?? 0), accent: 'var(--cyan)' },
    {
      label: 'Dados comprometidos confirmados',
      value: 'NENHUM COMPROMETIMENTO IDENTIFICADO NA TELEMETRIA DISPONÍVEL',
      mono: true,
      accent: 'var(--green)',
      note: true
    },
    { label: 'Primeiro evento registado', value: summary.first_seen_ts ? fmtTs(summary.first_seen_ts) : 'SEM TELEMETRIA TEMPORAL', mono: true },
    { label: 'Último evento registado', value: summary.last_seen_ts ? fmtTs(summary.last_seen_ts) : 'SEM TELEMETRIA TEMPORAL', mono: true }
  ];

  return (
    <div>
      <SectionTitle>Resumo da Análise</SectionTitle>
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            padding: '6px 10px',
            background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
            gap: 10
          }}>
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', flexShrink: 0 }}>
              {r.label}
            </span>
            <span style={{
              fontSize: r.note ? '0.62rem' : '0.72rem',
              fontFamily: r.mono ? 'var(--font-mono)' : 'inherit',
              color: r.accent || '#ddd',
              textAlign: 'right', wordBreak: 'break-word'
            }}>
              {r.value}
            </span>
          </div>
        ))}
      </div>

      {/* Proveniência */}
      <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 3 }}>
        <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: 3 }}>
          PROVENIÊNCIA DOS DADOS
        </div>
        <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          Fontes: {(provenance?.sources || []).join(' · ')}<br />
          GeoIP: {provenance?.geo_provider || 'ip-api.com'}<br />
          Classificação: <ProvenanceBadge classification={provenance?.classification || 'OBSERVADO'} />{' '}
          Confiança: <span style={{ color: 'var(--cyan)' }}>{provenance?.confidence || 'MÉDIO'}</span>
        </div>
        {(provenance?.limitations || []).length > 0 && (
          <div style={{ marginTop: 5 }}>
            <div style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', marginBottom: 2 }}>LIMITAÇÕES:</div>
            {provenance.limitations.map((l, i) => (
              <div key={i} style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                › {l}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Área G — Conclusão ────────────────────────────────────────────────────────
function ConclusionArea({ intel }) {
  const { conclusion, result } = intel;
  const accent = resultAccent(result.color);

  return (
    <div style={{
      border: `1px solid ${accent}44`,
      borderRadius: 4, padding: '14px 16px',
      background: `${accent}08`
    }}>
      <SectionTitle accent={accent}>Conclusão da Análise</SectionTitle>
      <div style={{
        fontSize: '0.78rem', fontFamily: 'var(--font-mono)', lineHeight: 1.7,
        color: '#ddd', marginBottom: 12
      }}>
        {conclusion || 'Sem dados suficientes para gerar conclusão determinística.'}
      </div>
      <div style={{
        display: 'inline-block', padding: '8px 16px',
        background: `${accent}18`,
        border: `2px solid ${accent}`,
        borderRadius: 3
      }}>
        <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: 2 }}>RESULTADO:</div>
        <div style={{
          fontSize: '0.82rem', fontFamily: 'var(--font-display)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em', color: accent
        }}>
          {result.label}
        </div>
      </div>
    </div>
  );
}

// ── Origem Desconhecida — painel extra ────────────────────────────────────────
function UnknownOriginPanel({ analysis }) {
  if (!analysis) return null;
  return (
    <div style={{ border: '1px solid var(--amber)33', borderRadius: 4, padding: 12, background: 'rgba(255,170,0,0.05)' }}>
      <SectionTitle accent="var(--amber)">Análise de Origem Não Determinada (??)</SectionTitle>
      <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
        A geolocalização destes {analysis.total_unresolved_ips} IP(s) não pôde ser determinada. Causas possíveis (não é possível determinar qual sem investigação manual):
      </div>
      <ul style={{ margin: '0 0 10px', paddingLeft: 18 }}>
        {(analysis.possible_reasons || []).map((r, i) => (
          <li key={i} style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', marginBottom: 4 }}>
            {r}
          </li>
        ))}
      </ul>
      {(analysis.sample_ips || []).length > 0 && (
        <div>
          <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: 4 }}>
            AMOSTRA DE IPs NÃO RESOLVIDOS:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {analysis.sample_ips.map((s, i) => (
              <span key={i} style={{
                fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
                padding: '2px 6px', border: '1px solid var(--amber)33', borderRadius: 2, color: 'var(--amber)'
              }}>
                {s.ip} ({s.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── IPs de Origem ──────────────────────────────────────────────────────────────
function OriginsTable({ ips }) {
  if (!ips?.attack_origins?.length && !ips?.blocked?.length && !ips?.alerted?.length) {
    return null;
  }

  return (
    <div>
      <SectionTitle>IPs Desta Origem</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {ips.attack_origins?.length > 0 && (
          <div style={{ border: '1px solid rgba(0,212,255,0.15)', borderRadius: 4, padding: 10 }}>
            <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: 6 }}>
              SUSPEITOS NGINX (TOP {ips.attack_origins.length})
            </div>
            {ips.attack_origins.map((o, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--red)' }}>{o.ip}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>{fmt(o.count)} hits</span>
              </div>
            ))}
          </div>
        )}

        {ips.blocked?.length > 0 && (
          <div style={{ border: '1px solid rgba(0,255,136,0.15)', borderRadius: 4, padding: 10 }}>
            <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: 6 }}>
              BLOQUEADOS ({ips.blocked.length})
            </div>
            {ips.blocked.map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--green)' }}>{b.ip}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                  {b.source} — {b.reason}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Validação defensiva do contrato security_intelligence_v1 ─────────────────
// Detecta e classifica payload incompatível na fronteira frontend.
// NÃO esconde bugs — identifica campo, tipo esperado, tipo recebido.
function validateIntelPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    errors.push(`payload inválido: recebido ${typeof payload}`);
    return errors;
  }
  if (payload.schema_version !== 'security_intelligence_v1') {
    errors.push(`schema_version inválido: '${payload.schema_version}'`);
  }
  if (!payload.selection || typeof payload.selection !== 'object') {
    errors.push(`selection: esperado object, recebido ${typeof payload.selection}`);
  }
  if (!payload.summary || typeof payload.summary !== 'object') {
    errors.push(`summary: esperado object, recebido ${typeof payload.summary}`);
  }
  if (!Array.isArray(payload.attack_vectors)) {
    errors.push(`attack_vectors: esperado Array, recebido ${Object.prototype.toString.call(payload.attack_vectors)}`);
  }
  if (!Array.isArray(payload.targeted_surfaces)) {
    errors.push(`targeted_surfaces: esperado Array, recebido ${Object.prototype.toString.call(payload.targeted_surfaces)}`);
  }
  if (!Array.isArray(payload.timeline)) {
    errors.push(`timeline: esperado Array, recebido ${Object.prototype.toString.call(payload.timeline)}`);
  }
  if (!Array.isArray(payload.protection_layers)) {
    errors.push(`protection_layers: esperado Array, recebido ${Object.prototype.toString.call(payload.protection_layers)}`);
  }
  if (!payload.provenance || typeof payload.provenance !== 'object') {
    errors.push(`provenance: esperado object, recebido ${typeof payload.provenance}`);
  }
  if (!payload.result || typeof payload.result !== 'object') {
    errors.push(`result: esperado object, recebido ${typeof payload.result}`);
  }
  if (typeof payload.conclusion !== 'string') {
    errors.push(`conclusion: esperado string, recebido ${typeof payload.conclusion}`);
  }
  return errors;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function SecurityEvidenceDrilldown({ selection, onClose }) {
  const [intel, setIntel]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const panelRef = useRef(null);
  const abortRef = useRef(null);

  // Limpa estado residual ao trocar origem (evita relatório anterior + erro novo)
  useEffect(() => {
    setIntel(null);
    setError(null);
    setLatencyMs(null);
  }, [selection?.key]);

  const load = useCallback(async () => {
    if (!selection?.key) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setIntel(null);
    const t0 = Date.now();
    try {
      const body = await api(
        `/security-dashboard/intelligence?country_code=${encodeURIComponent(selection.key)}`,
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;

      setLatencyMs(Date.now() - t0);

      const payload = body?.data;

      const contractErrors = validateIntelPayload(payload);
      if (contractErrors.length > 0) {
        const detail = contractErrors.join('; ');
        console.error('[SecurityEvidenceDrilldown] payload incompatível:', detail, payload);
        setError(`PAYLOAD ANALÍTICO INCOMPATÍVEL — ${detail}`);
        return;
      }

      setIntel(payload);
    } catch (e) {
      if (controller.signal.aborted || e?.name === 'AbortError') return;
      setLatencyMs(Date.now() - t0);
      setError(formatSocApiError(e, `inteligência territorial (${selection?.label || selection?.key})`));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [selection?.key, selection?.label]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  // Foco acessível ao abrir
  useEffect(() => {
    if (panelRef.current) panelRef.current.focus();
  }, []);

  // Fechar com Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="region"
      aria-label={`Painel de análise de segurança: ${selection?.label || selection?.key}`}
      style={{
        outline: 'none',
        background: 'var(--bg-secondary, #0d1520)',
        border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: 6,
        marginTop: 12,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)'
      }}
    >
      {/* Loading overlay */}
      {loading && !intel && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 40, flexDirection: 'column', gap: 12
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '2px solid rgba(0,212,255,0.15)',
            borderTop: '2px solid var(--cyan)',
            animation: 'spin 0.8s linear infinite'
          }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            Resolvendo evidências para {selection?.label || selection?.key}…
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Erro — diferencia categorias de falha */}
      {!loading && error && (
        <div style={{ padding: 20 }}>
          {/* Cabeçalho do erro */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
            padding: '8px 12px', background: 'rgba(255,64,64,0.08)',
            border: '1px solid rgba(255,64,64,0.3)', borderRadius: 4
          }}>
            <span style={{ color: 'var(--red)', fontSize: '1rem' }}>⚠</span>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700,
                color: 'var(--red)', letterSpacing: '0.04em', marginBottom: 2
              }}>
                {error.startsWith('PAYLOAD') ? 'PAYLOAD ANALÍTICO INCOMPATÍVEL' : 'FALHA AO CARREGAR INTELIGÊNCIA'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-tertiary)', wordBreak: 'break-word' }}>
                {error}
              </div>
            </div>
          </div>

          {/* Distinção semântica */}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: 12, lineHeight: 1.6 }}>
            {error.startsWith('PAYLOAD')
              ? 'O servidor respondeu, mas o payload não corresponde ao contrato security_intelligence_v1. Verifique os logs do backend.'
              : error.includes('401') || error.includes('auth') || error.toLowerCase().includes('token') || error.includes('Sessão expirada')
                ? 'Sessão expirada ou sem autorização. Faça login novamente.'
                : error.includes('anti-recon') || error.includes('HTTP 404')
                  ? 'A rota de inteligência territorial respondeu 404. Use «Tentar novamente»; se persistir, verifique sessão e política anti-recon.'
                  : 'Falha de rede ou servidor indisponível. O sistema tentará novamente.'}
          </div>

          <button
            onClick={load}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem', padding: '4px 12px',
              background: 'transparent', border: '1px solid var(--cyan)', borderRadius: 3, color: 'var(--cyan)', cursor: 'pointer'
            }}
          >
            ⟳ Tentar novamente
          </button>
        </div>
      )}

      {/* Painel completo */}
      {intel && (
        <>
          {/* Área A — Cabeçalho */}
          <HeaderArea
            intel={intel}
            onClose={onClose}
            onRefresh={load}
            loading={loading}
          />

          {/* Corpo do painel */}
          <div style={{ padding: '16px 18px' }}>

            {/* Latência P50/P95 debug */}
            {latencyMs != null && (
              <div style={{
                fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
                marginBottom: 14, display: 'flex', gap: 16
              }}>
                <span>Latência: <strong style={{ color: latencyMs < 500 ? 'var(--green)' : latencyMs < 2000 ? 'var(--amber)' : 'var(--red)' }}>{latencyMs}ms</strong></span>
                <span>Cache dashboard: <strong style={{ color: 'var(--cyan)' }}>{intel.from_cache ? 'HIT' : 'MISS'}</strong></span>
                <span>Fontes: nginx + threat-watch + fail2ban + UFW + admin_logs</span>
              </div>
            )}

            {/* Área B — Vetores */}
            <div style={{ marginBottom: 16 }}>
              <VectorsArea vectors={intel.attack_vectors} />
            </div>

            {/* Área C — Resposta */}
            <div style={{ marginBottom: 16 }}>
              <ResponseArea intel={intel} />
            </div>

            {/* Área D — Timeline */}
            <div style={{ marginBottom: 16 }}>
              <TimelineArea timeline={intel.timeline} />
            </div>

            {/* Layout de 2 colunas: Resumo + Camadas de Protecção */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 340px)',
              gap: 14, marginBottom: 16,
              alignItems: 'start'
            }}
            className="intel-main-grid"
            >
              {/* Área F — Resumo */}
              <div>
                <SummaryCard intel={intel} />
                {/* IPs */}
                <div style={{ marginTop: 14 }}>
                  <OriginsTable ips={intel.ips} />
                </div>
                {/* Superfícies visadas */}
                {(intel.targeted_surfaces || []).length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <SectionTitle>Endpoints Visados</SectionTitle>
                    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                      {intel.targeted_surfaces.slice(0, 8).map((s, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '5px 10px',
                          background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
                        }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--amber)', wordBreak: 'break-all' }}>
                            {s.path}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-tertiary)', marginLeft: 12, whiteSpace: 'nowrap' }}>
                            {fmt(s.count)}×
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Área E — Camadas de Protecção */}
              <div style={{
                border: '1px solid rgba(0,212,255,0.1)',
                borderRadius: 4, padding: '12px 10px',
                background: 'rgba(0,0,0,0.2)',
                maxHeight: 560, display: 'flex', flexDirection: 'column'
              }}>
                <ProtectionLayersPanel layers={intel.protection_layers} />
              </div>
            </div>

            {/* Origem desconhecida */}
            {intel.unknown_origin_analysis && (
              <div style={{ marginBottom: 16 }}>
                <UnknownOriginPanel analysis={intel.unknown_origin_analysis} />
              </div>
            )}

            {/* Área H — Fluxo Temporal da Origem (SEC-FLOW-001 / ORIGIN) */}
            {selection?.key && !['??', 'LO'].includes(selection.key) && (
              <div style={{ marginBottom: 16 }}>
                <ThreatFlowPanel
                  scope="ORIGIN"
                  scopeId={selection.key}
                  compact
                />
              </div>
            )}

            {/* Área G — Conclusão */}
            <ConclusionArea intel={intel} />
          </div>
        </>
      )}

      {/* CSS responsivo inline */}
      <style>{`
        @media (max-width: 700px) {
          .intel-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
