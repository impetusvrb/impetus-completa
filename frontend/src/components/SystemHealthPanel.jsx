/**
 * Painel de saúde do motor cognitivo unificado (GET /api/internal/unified-health).
 * Níveis: executivo + operacional (todos) | auditoria técnica (admin / internal_admin / admin_system).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import {
  userCanAccessSystemHealth,
  userCanAdvancedAudit,
  userSeesFullHealthPayload
} from '../utils/systemHealthAccess';
import './SystemHealthPanel.css';

export { userCanAccessSystemHealth, userCanAdvancedAudit };

const POLL_MS = 30000;

const statusPresentation = {
  good: { token: 'good', label: 'OK' },
  healthy: { token: 'good', label: 'OK' },
  warning: { token: 'warning', label: 'Atenção' },
  critical: { token: 'critical', label: 'Crítico' },
  unknown: { token: 'unknown', label: '—' }
};

function semanticFromToken(token) {
  if (token === 'good') return { token, color: 'var(--green)', border: 'var(--green-dim)' };
  if (token === 'warning') return { token, color: 'var(--amber)', border: 'var(--amber-dim)' };
  if (token === 'critical') return { token, color: 'var(--red)', border: 'var(--red-dim)' };
  return { token: 'unknown', color: 'var(--text-tertiary)', border: 'var(--border-subtle)' };
}

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
    let u = null;
    if (s && s.trim()) {
      try {
        const parsed = JSON.parse(s);
        if (parsed && typeof parsed === 'object') u = parsed;
      } catch {
        u = null;
      }
    }
    const role = u?.role != null ? String(u.role).trim().toLowerCase() : '';
    /** UI do painel visível para qualquer sessão válida; autorização fina é na API (403). */
    const allowed = !!token && !!u;
    return {
      token,
      role,
      companyId: u?.company_id != null ? u.company_id : null,
      allowed
    };
  } catch {
    return { token: null, role: '', companyId: null, allowed: false };
  }
}

function parseUser() {
  try {
    const s = localStorage.getItem('impetus_user');
    if (!s || !s.trim()) return null;
    const u = JSON.parse(s);
    return u && typeof u === 'object' ? u : null;
  } catch {
    return null;
  }
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

function pct01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 1000) / 10;
}

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return Math.min(1, Math.max(0, n));
}

/**
 * Sinais normalizados para score, narrativa, alerta e confiança (sem inferir histórico).
 */
function readOperationalSignals(payload) {
  if (!payload) {
    return {
      dq: NaN,
      td: NaN,
      fr: NaN,
      hrr: NaN,
      er: NaN,
      st: NaN,
      hasDq: false,
      hasTd: false,
      hasFr: false,
      hasHrr: false,
      hasEr: false,
      hasSt: false
    };
  }
  const h = payload.health && typeof payload.health === 'object' ? payload.health : null;
  const m = payload.metrics && typeof payload.metrics === 'object' ? payload.metrics : {};
  const v = h?.validation && typeof h.validation === 'object' ? h.validation : null;
  const sis = payload.system_influence_summary;

  const dq = h != null ? Number(h.decision_quality) : NaN;
  const td = Number(m.total_decisions);
  const fr = Number(h?.fallback_rate != null ? h.fallback_rate : m.fallback_rate);
  const hrr = sis != null && sis.high_risk_rate != null ? Number(sis.high_risk_rate) : NaN;
  const er = v != null ? Number(v.error_rate) : NaN;
  const st = h != null ? Number(h.stability_score) : NaN;

  return {
    dq,
    td,
    fr,
    hrr,
    er,
    st,
    hasDq: Number.isFinite(dq),
    hasTd: Number.isFinite(td),
    hasFr: Number.isFinite(fr),
    hasHrr: Number.isFinite(hrr),
    hasEr: Number.isFinite(er),
    hasSt: Number.isFinite(st)
  };
}

/** Classificação qualidade (0–1) */
function classifyDecisionQuality(q) {
  const n = Number(q);
  if (!Number.isFinite(n)) return null;
  if (n >= 0.75) return { token: 'good', label: 'Alta qualidade', text: 'desempenho sólido na janela atual' };
  if (n >= 0.6) return { token: 'warning', label: 'Qualidade aceitável', text: 'monitorizar evolução' };
  return { token: 'critical', label: 'Qualidade abaixo do ideal', text: 'atenção recomendada' };
}

function classifyLatencyMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return { token: 'unknown', label: '—', text: 'sem amostras suficientes' };
  if (n < 800) return { token: 'good', label: 'Ótima', text: 'resposta rápida' };
  if (n <= 2000) return { token: 'warning', label: 'Moderada', text: 'aceitável para maioria dos casos' };
  return { token: 'critical', label: 'Lenta', text: 'avaliar carga ou integrações' };
}

function classifyHighRiskRate(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return { token: 'unknown', label: '—', text: 'dado indisponível' };
  const p = n * 100;
  if (n > 0.05) return { token: 'critical', label: 'Alto risco', text: `${Math.round(p * 10) / 10}% das amostras com risco elevado` };
  if (n > 0.02) return { token: 'warning', label: 'Risco moderado', text: `${Math.round(p * 10) / 10}% — acompanhar decisões sensíveis` };
  return { token: 'good', label: 'Baixo risco', text: `${Math.round(p * 10) / 10}% — dentro do esperado` };
}

function classifyRateThreshold(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return { token: 'unknown', label: '—' };
  const p = n * 100;
  if (n > 0.05) return { token: 'critical', label: `Crítico (${Math.round(p * 10) / 10}%)` };
  if (n >= 0.02) return { token: 'warning', label: `Atenção (${Math.round(p * 10) / 10}%)` };
  return { token: 'good', label: `Normal (${Math.round(p * 10) / 10}%)` };
}

/**
 * Score global 0–1: estabilidade direta (API) ou composto qualidade / fallback / risco.
 * Sem imputar qualidade neutra quando falta o dado: pesos renormalizados só entre dimensões presentes.
 * @returns {{ score: number|null, source: 'stability'|'composite', incomplete: boolean } | null}
 */
function computeGlobalHealthScore(payload) {
  if (!payload?.health || typeof payload.health !== 'object') return null;
  const h = payload.health;
  const st = Number(h.stability_score);
  if (Number.isFinite(st)) {
    return { score: clamp01(st), source: 'stability', incomplete: false };
  }

  const dq = Number(h.decision_quality);
  const m = payload.metrics && typeof payload.metrics === 'object' ? payload.metrics : {};
  const fr = Number(h.fallback_rate != null ? h.fallback_rate : m.fallback_rate);
  const sis = payload.system_influence_summary;
  const hrr = sis != null && sis.high_risk_rate != null ? Number(sis.high_risk_rate) : NaN;

  const parts = [];
  const q = clamp01(dq);
  if (q != null) parts.push({ w: 0.4, v: q });
  const fb = clamp01(fr);
  if (fb != null) parts.push({ w: 0.3, v: 1 - fb });
  const hr = clamp01(hrr);
  if (hr != null) parts.push({ w: 0.3, v: 1 - hr });

  if (!parts.length) {
    return { score: null, source: 'composite', incomplete: true };
  }

  const fullComposite = q != null && fb != null && hr != null;
  const sumW = parts.reduce((s, p) => s + p.w, 0);
  const score = parts.reduce((s, p) => s + p.v * (p.w / sumW), 0);

  return {
    score: clamp01(score),
    source: 'composite',
    incomplete: !fullComposite
  };
}

function globalHealthBand(score) {
  if (!Number.isFinite(score)) return null;
  if (score >= 0.75) return { label: 'Saudável', tone: 'good', color: 'var(--green)' };
  if (score >= 0.6) return { label: 'Atenção', tone: 'warning', color: 'var(--amber)' };
  return { label: 'Crítico', tone: 'critical', color: 'var(--red)' };
}

function GlobalHealthCard({ payload }) {
  const data = computeGlobalHealthScore(payload);
  if (!data) return null;

  if (data.score == null || !Number.isFinite(data.score)) {
    const sem = semanticFromToken('unknown');
    return (
      <div
        className="impetus-sys-health__card impetus-sys-health__global-health impetus-sys-health__global-health--incomplete"
        data-tone="unknown"
        style={{ borderLeftColor: sem.border }}
        role="region"
        aria-label="Saúde geral do sistema"
      >
        <div className="impetus-sys-health__card-title">Saúde Geral do Sistema</div>
        <div className="impetus-sys-health__global-health__value" style={{ color: sem.color }}>
          Dados incompletos
        </div>
        <p className="impetus-sys-health__global-health__sub">
          Não foi possível compor o indicador: faltam métricas na resposta atual. Confirme permissões e
          preenchimento da janela.
        </p>
      </div>
    );
  }

  const band = globalHealthBand(data.score);
  if (!band) return null;
  const pct = Math.round(data.score * 100);
  return (
    <div
      className={`impetus-sys-health__card impetus-sys-health__global-health${data.incomplete ? ' impetus-sys-health__global-health--partial' : ''}`}
      data-tone={band.tone}
      style={{ borderLeftColor: band.color }}
      role="region"
      aria-label="Saúde geral do sistema"
    >
      <div className="impetus-sys-health__card-title">Saúde Geral do Sistema</div>
      <div className="impetus-sys-health__global-health__value" style={{ color: band.color }}>
        {band.label} ({pct}%)
      </div>
      <p className="impetus-sys-health__global-health__sub">
        {data.source === 'stability'
          ? 'Derivado do índice de estabilidade reportado pelo motor.'
          : data.incomplete
            ? 'Leitura parcial: o score agrega só as dimensões disponíveis (qualidade, fallback e/ou risco).'
            : 'Baseado em qualidade, fallback e risco operacional na janela atual.'}
      </p>
    </div>
  );
}

const INSIGHT_RANK = { critical: 3, warning: 2, info: 2, positive: 1 };

const INSIGHT_ICONS = {
  critical: '⚠️',
  warning: '⚠️',
  info: 'ℹ️',
  positive: '✅'
};

/**
 * Insights automáticos (máx. 5, por gravidade). Sem dados técnicos no texto.
 * Secção só aparece se existir pelo menos um alerta ou aviso informativo (não só elogios).
 */
function buildSystemInsights(payload) {
  if (!payload) return [];
  const h = payload.health && typeof payload.health === 'object' ? payload.health : null;
  const m = payload.metrics && typeof payload.metrics === 'object' ? payload.metrics : {};
  const sis = payload.system_influence_summary;

  /** @type {{ id: string, level: 'critical'|'warning'|'info'|'positive', message: string }[]} */
  const raw = [];

  const dq = h != null ? Number(h.decision_quality) : NaN;
  if (Number.isFinite(dq)) {
    if (dq < 0.6) {
      raw.push({
        id: 'quality-low',
        level: 'critical',
        message: 'Qualidade abaixo do ideal — risco de decisões incorretas'
      });
    } else if (dq >= 0.75) {
      raw.push({
        id: 'quality-high',
        level: 'positive',
        message: 'Qualidade elevada — sistema operando com boa precisão'
      });
    }
  }

  const fr = Number(h?.fallback_rate != null ? h.fallback_rate : m.fallback_rate);
  if (Number.isFinite(fr) && fr > 0.05) {
    raw.push({
      id: 'fallback-high',
      level: 'critical',
      message: 'Alta taxa de fallback — instabilidade detectada'
    });
  }

  const hrr = sis != null && sis.high_risk_rate != null ? Number(sis.high_risk_rate) : NaN;
  if (Number.isFinite(hrr) && hrr > 0.05) {
    raw.push({
      id: 'risk-high',
      level: 'critical',
      message: 'Risco operacional elevado — decisões críticas em alta'
    });
  }

  const cu = h != null ? Number(h.cognitive_usage) : NaN;
  if (Number.isFinite(cu)) {
    if (cu < 0.4) {
      raw.push({
        id: 'cognitive-low',
        level: 'info',
        message: 'Baixa utilização do sistema cognitivo'
      });
    } else if (cu > 0.7) {
      raw.push({
        id: 'cognitive-high',
        level: 'positive',
        message: 'Uso cognitivo predominante'
      });
    }
  }

  let latCog = NaN;
  if (m.avg_latency && typeof m.avg_latency === 'object') latCog = Number(m.avg_latency.cognitive);
  if (!Number.isFinite(latCog) || latCog <= 0) latCog = Number(m.avg_latency_cognitive);
  if (Number.isFinite(latCog) && latCog > 2000) {
    raw.push({
      id: 'latency-cognitive',
      level: 'critical',
      message: 'Latência cognitiva elevada — impacto na resposta'
    });
  }

  const seen = new Set();
  let unique = raw.filter((x) => {
    if (seen.has(x.id)) return false;
    seen.add(x.id);
    return true;
  });

  const needsAttention = unique.some((x) => x.level !== 'positive');
  if (!needsAttention) return [];

  const hasId = (id) => unique.some((x) => x.id === id);
  const withoutIds = (ids) => unique.filter((x) => !ids.includes(x.id));

  if (hasId('fallback-high') && hasId('risk-high')) {
    unique = withoutIds(['fallback-high', 'risk-high']);
    unique.unshift({
      id: 'compound-fallback-risk',
      level: 'critical',
      message:
        'Instabilidade operacional crítica detectada — fallback elevado e risco alto em conjunto.'
    });
  } else if (hasId('quality-low') && hasId('fallback-high')) {
    unique = withoutIds(['quality-low', 'fallback-high']);
    unique.unshift({
      id: 'compound-quality-fallback',
      level: 'critical',
      message: 'Desempenho degradado: qualidade baixa com recurso frequente a fallback.'
    });
  } else if (hasId('quality-low') && hasId('risk-high')) {
    unique = withoutIds(['quality-low', 'risk-high']);
    unique.unshift({
      id: 'compound-quality-risk',
      level: 'critical',
      message: 'Risco confluente — qualidade baixa e exposição operacional elevada.'
    });
  }

  unique.sort((a, b) => {
    const ac = a.id.startsWith('compound-') ? 1 : 0;
    const bc = b.id.startsWith('compound-') ? 1 : 0;
    if (bc !== ac) return bc - ac;
    return INSIGHT_RANK[b.level] - INSIGHT_RANK[a.level];
  });
  return unique.slice(0, 5);
}

function trendClosingSentence(vol, qual, err, fallbackStressed) {
  const stressed = err === 'high' || err === 'moderate' || fallbackStressed;
  if (vol === 'high' && qual === 'risk') {
    return 'Em síntese, o sistema opera sob carga elevada com estabilidade aparentemente fragilizada nesta leitura.';
  }
  if (vol === 'high' && qual === 'stable') {
    return 'O sistema opera com estabilidade moderada sob carga elevada.';
  }
  if (vol === 'high' && qual === 'consistent') {
    return 'O sistema sustenta carga elevada com folga aparente na qualidade neste instante.';
  }
  if (vol === 'moderate' && qual === 'risk') {
    return 'O sistema opera com estabilidade moderada sob carga moderada, com tensão na qualidade.';
  }
  if (vol === 'moderate' && (qual === 'stable' || qual === 'consistent')) {
    return stressed
      ? 'O ritmo é moderado e a leitura pede vigilância face aos sinais auxiliares.'
      : 'O ritmo é moderado e a leitura é equilibrada neste instante.';
  }
  if (vol === 'low') {
    return stressed
      ? 'O ritmo operacional é contenido, mas persistem sinais a acompanhar.'
      : 'O ritmo operacional é contenido, com leitura estável neste instante.';
  }
  if (qual === 'risk') {
    return 'Em síntese, a qualidade merece prioridade mesmo com o volume parcialmente indisponível.';
  }
  if (qual === 'stable' || qual === 'consistent') {
    return stressed
      ? 'Em síntese, a qualidade parece sustentável, com ressalvas nos indicadores auxiliares.'
      : 'Em síntese, a leitura é coerente com operação estável neste ponto.';
  }
  if (err === 'high' || fallbackStressed) {
    return 'Em síntese, a validação e o comportamento de rota sugerem vigilância acrescida.';
  }
  if (err === 'moderate') {
    return 'Em síntese, o quadro é gerível, com ruído moderado na validação.';
  }
  return 'Esta leitura resume o instante atual, sem projecção de evolução.';
}

/**
 * Interpretação contextual estática (snapshot atual). Sem histórico, sem números na UI.
 * @returns {string|null}
 */
function buildTrendNarrative(payload) {
  if (!payload) return null;
  const sig = readOperationalSignals(payload);

  let qual = null;
  if (sig.hasDq) {
    if (sig.dq > 0.75) qual = 'consistent';
    else if (sig.dq >= 0.6) qual = 'stable';
    else qual = 'risk';
  }

  let vol = null;
  if (sig.hasTd) {
    if (sig.td > 1000) vol = 'high';
    else if (sig.td >= 300) vol = 'moderate';
    else vol = 'low';
  }

  let err = null;
  if (sig.hasEr) {
    if (sig.er > 0.05) err = 'high';
    else if (sig.er >= 0.02) err = 'moderate';
    else err = 'stable';
  }

  const fallbackStressed = sig.hasFr && sig.fr > 0.05;

  const sentences = [];

  if (vol && qual) {
    const volPhrase =
      vol === 'high'
        ? 'alta atividade'
        : vol === 'moderate'
          ? 'atividade moderada'
          : 'baixa atividade';
    const qualPhrase =
      qual === 'consistent'
        ? 'qualidade consistente'
        : qual === 'stable'
          ? 'qualidade estável'
          : 'qualidade em risco';
    if (vol === 'high' && qual === 'risk') {
      sentences.push(
        `Nesta leitura, o sistema apresenta ${volPhrase} com ${qualPhrase}, o que merece atenção operacional.`
      );
    } else {
      sentences.push(`Nesta leitura, o sistema regista ${volPhrase} com ${qualPhrase}.`);
    }
  } else if (vol) {
    const open =
      vol === 'high'
        ? 'Alta atividade do sistema na janela atual.'
        : vol === 'moderate'
          ? 'Atividade moderada na janela atual.'
          : 'Baixa atividade na janela atual.';
    sentences.push(open);
  } else if (qual) {
    const open =
      qual === 'consistent'
        ? 'Qualidade consistente nas decisões avaliadas nesta leitura.'
        : qual === 'stable'
          ? 'Qualidade estável nas decisões avaliadas nesta leitura.'
          : 'Qualidade em risco nas decisões avaliadas nesta leitura.';
    sentences.push(open);
  }

  if (err === 'high') {
    sentences.push('A validação aponta taxa de erro elevada.');
  } else if (err === 'moderate') {
    sentences.push('Registam-se erros moderados na validação.');
  } else if (err === 'stable') {
    sentences.push('A validação sugere sistema estável.');
  }

  if (fallbackStressed) {
    sentences.push('Há sinais de instabilidade nas respostas automáticas.');
  }

  if (!sentences.length) return null;

  const body = sentences.slice(0, 4);
  if (body.length < 3) {
    body.push('Esta interpretação reflete apenas o estado instantâneo, sem evolução temporal.');
  }

  const closing = trendClosingSentence(vol, qual, err, fallbackStressed);
  return [...body, closing].join(' ');
}

/**
 * Deteção leve de tensão entre sinais (sem histórico). Refina confiança, não substitui auditoria.
 */
function detectSignalTension(sig) {
  const hints = [];
  if (
    sig.hasDq &&
    sig.dq >= 0.75 &&
    sig.hasHrr &&
    sig.hrr > 0.05
  ) {
    hints.push('qualidade elevada face a risco operacional alto — possível inconsistência.');
  }
  if (sig.hasDq && sig.dq >= 0.75 && sig.hasFr && sig.fr > 0.05) {
    hints.push('qualidade elevada com fallback acentuado — possível inconsistência.');
  }
  if (sig.hasDq && sig.dq >= 0.75 && sig.hasEr && sig.er > 0.05) {
    hints.push('qualidade elevada com validação exigente — cruzar antes de agir.');
  }
  if (!hints.length) return null;
  return hints[0];
}

/**
 * Confiança da análise agregada (cobertura + tensão entre sinais neste snapshot).
 * @returns {{ level: 'high'|'medium'|'low', label: string, consistencyHint?: string }}
 */
function computeAnalysisConfidence(payload) {
  const sig = readOperationalSignals(payload);
  const bits = [
    sig.hasDq,
    sig.hasFr,
    sig.hasHrr,
    sig.hasTd,
    sig.hasEr,
    sig.hasSt
  ];
  const n = bits.filter(Boolean).length;
  const data = computeGlobalHealthScore(payload);
  const partialComposite = data?.source === 'composite' && data?.incomplete === true;

  let level;
  if (n >= 5 && !partialComposite) {
    level = 'high';
  } else if (n >= 3) {
    level = 'medium';
  } else if (n >= 1) {
    level = 'low';
  } else {
    level = 'low';
  }

  const tension = detectSignalTension(sig);
  let consistencyHint = null;
  if (tension) {
    consistencyHint = `Consistência: ${tension}`;
    if (level === 'high') level = 'medium';
    else if (level === 'medium') level = 'low';
  }

  const label = level === 'high' ? 'alta' : level === 'medium' ? 'média' : 'baixa';
  return { level, label, consistencyHint };
}

/**
 * Alerta prioritário único (snapshot): prioriza confluência fallback × risco × qualidade.
 * `covers` evita repetir os mesmos temas na síntese operacional.
 * @returns {{ level: 'critical'|'warning', message: string, covers: string[] } | null}
 */
function computePrimaryAlert(payload) {
  if (!payload) return null;
  const sig = readOperationalSignals(payload);
  const dqOk = sig.hasDq;
  const frHigh = sig.hasFr && sig.fr > 0.05;
  const frWarn = sig.hasFr && sig.fr > 0.02 && sig.fr <= 0.05;
  const riskHigh = sig.hasHrr && sig.hrr > 0.05;
  const riskWarn = sig.hasHrr && sig.hrr > 0.02 && sig.hrr <= 0.05;
  const qualCrit = dqOk && sig.dq < 0.6;
  const qualWarn = dqOk && sig.dq >= 0.6 && sig.dq < 0.75;

  if (frHigh && riskHigh) {
    return {
      level: 'critical',
      message: 'Instabilidade operacional crítica detectada.',
      covers: ['instability', 'fallback', 'risk']
    };
  }
  if (qualCrit && frHigh) {
    return {
      level: 'critical',
      message: 'Desempenho degradado: qualidade baixa e fallback elevado.',
      covers: ['quality', 'fallback']
    };
  }
  if (qualCrit && riskHigh) {
    return {
      level: 'critical',
      message: 'Exposição elevada: qualidade baixa e risco operacional alto.',
      covers: ['quality', 'risk']
    };
  }
  if (frHigh) {
    return {
      level: 'critical',
      message: 'Fallback elevado — rever rotas e resiliência do motor.',
      covers: ['fallback']
    };
  }
  if (riskHigh) {
    return {
      level: 'critical',
      message: 'Risco operacional elevado na janela atual.',
      covers: ['risk']
    };
  }
  if (qualCrit) {
    return {
      level: 'critical',
      message: 'Qualidade de decisão abaixo do patamar seguro.',
      covers: ['quality']
    };
  }
  if (frWarn && riskWarn) {
    return {
      level: 'warning',
      message: 'Instabilidade operacional detectada — acompanhar evolução.',
      covers: ['instability', 'fallback', 'risk']
    };
  }
  if (frWarn) {
    return {
      level: 'warning',
      message: 'Fallback acima do conforto operacional.',
      covers: ['fallback']
    };
  }
  if (riskWarn) {
    return {
      level: 'warning',
      message: 'Risco moderado — decisões sensíveis em destaque.',
      covers: ['risk']
    };
  }
  if (qualWarn) {
    return {
      level: 'warning',
      message: 'Qualidade estável, porém com margem reduzida.',
      covers: ['quality']
    };
  }

  const er = sig.hasEr ? sig.er : NaN;
  if (sig.hasEr && er > 0.05) {
    return {
      level: 'critical',
      message: 'Validação com taxa de erro elevada.',
      covers: ['validation']
    };
  }
  if (sig.hasEr && er >= 0.02) {
    return {
      level: 'warning',
      message: 'Validação com erros moderados.',
      covers: ['validation']
    };
  }

  return null;
}

/**
 * Narrativa única do estado — síntese curta (máx. 2 frases), complementar ao alerta prioritário.
 * @param {{ covers?: string[] } | null} alert
 * @returns {string|null}
 */
function buildSystemNarrative(payload, alert) {
  if (!payload) return null;
  const sig = readOperationalSignals(payload);
  const cov = new Set(alert?.covers ?? []);

  let qualPhrase = null;
  if (sig.hasDq) {
    if (sig.dq < 0.6) qualPhrase = 'qualidade abaixo do ideal';
    else if (sig.dq < 0.75) qualPhrase = 'qualidade estável, com margem apertada';
    else qualPhrase = 'qualidade sólida';
  }

  let loadPhrase = null;
  if (sig.hasTd) {
    if (sig.td > 1000) loadPhrase = 'carga operacional elevada';
    else if (sig.td >= 300) loadPhrase = 'carga moderada';
    else loadPhrase = 'carga reduzida';
  }

  const unstable =
    (sig.hasFr && sig.fr > 0.05) ||
    (sig.hasHrr && sig.hrr > 0.05) ||
    (sig.hasEr && sig.er > 0.05);
  const fragile =
    (sig.hasFr && sig.fr > 0.02 && sig.fr <= 0.05) ||
    (sig.hasHrr && sig.hrr > 0.02 && sig.hrr <= 0.05) ||
    (sig.hasEr && sig.er >= 0.02 && sig.er <= 0.05);

  const alertOwnsStress =
    cov.has('instability') || cov.has('fallback') || cov.has('risk') || cov.has('validation');
  const mentionQuality = sig.hasDq && !cov.has('quality');
  const mentionValidationLine =
    sig.hasEr && !cov.has('validation') && sig.er >= 0.02;
  const mentionStressLine =
    unstable && !alertOwnsStress;
  const mentionFragileLine =
    !unstable && fragile && !alertOwnsStress;

  const sentences = [];

  if (mentionQuality && loadPhrase) {
    sentences.push(`O sistema apresenta ${qualPhrase} sob ${loadPhrase}.`);
  } else if (loadPhrase) {
    sentences.push(`Nesta leitura, o ritmo traduz-se em ${loadPhrase}.`);
  } else if (mentionQuality) {
    sentences.push(`O sistema apresenta ${qualPhrase} nesta leitura.`);
  }

  if (sentences.length >= 2) {
    return sentences.slice(0, 2).join(' ');
  }

  if (sentences.length === 0) {
    if (mentionValidationLine) {
      sentences.push(
        sig.er > 0.05
          ? 'A validação complementa o quadro com tensão acrescida.'
          : 'A validação mostra ruído moderado face ao restante contexto.'
      );
    } else if (mentionStressLine) {
      sentences.push('Há sinais confluentes de instabilidade ou validação exigente.');
    } else if (mentionFragileLine) {
      sentences.push('Há ruído moderado que convida a vigilância, sem colapso aparente.');
    }
    return sentences.length ? sentences.slice(0, 2).join(' ') : null;
  }

  if (mentionValidationLine) {
    sentences.push(
      sig.er > 0.05
        ? 'A validação cruza este retrato com tensão acrescida.'
        : 'A validação acrescenta ruído moderado ao contexto.'
    );
  } else if (mentionStressLine) {
    sentences.push('Outras dimensões sugerem pressão adicional no comportamento agregado.');
  } else if (mentionFragileLine) {
    sentences.push('O quadro geral mantém margem, com ruído a acompanhar.');
  }

  return sentences.slice(0, 2).join(' ');
}

function SystemTrendSection({ payload }) {
  const prose = useMemo(() => buildTrendNarrative(payload), [payload]);
  if (!prose) return null;

  return (
    <section
      className="impetus-sys-health__section impetus-sys-health__trend"
      aria-labelledby="sys-health-trend-title"
    >
      <SectionTitle>
        <span id="sys-health-trend-title">Tendência do Sistema</span>
      </SectionTitle>
      <p className="impetus-sys-health__trend-prose">{prose}</p>
    </section>
  );
}

function PrimaryAlertBanner({ alert }) {
  if (!alert) return null;
  const sem = semanticFromToken(alert.level === 'critical' ? 'critical' : 'warning');
  return (
    <div
      className="impetus-sys-health__primary-alert"
      data-level={alert.level}
      role="alert"
      style={{ borderLeftColor: sem.color }}
    >
      <span className="impetus-sys-health__primary-alert-icon" aria-hidden>
        {alert.level === 'critical' ? '●' : '◆'}
      </span>
      <span className="impetus-sys-health__primary-alert-text">{alert.message}</span>
    </div>
  );
}

function AnalysisConfidenceStrip({ confidence }) {
  if (!confidence) return null;
  const tone =
    confidence.level === 'high' ? 'good' : confidence.level === 'medium' ? 'warning' : 'unknown';
  const sem = semanticFromToken(tone);
  return (
    <div className="impetus-sys-health__confidence-wrap">
      <p className="impetus-sys-health__confidence" data-level={confidence.level}>
        <span className="impetus-sys-health__confidence-label">Confiança da análise:</span>{' '}
        <span className="impetus-sys-health__confidence-value" style={{ color: sem.color }}>
          {confidence.label}
        </span>
        <span className="impetus-sys-health__confidence-hint">
          {' '}
          (cobertura e coerência dos sinais neste instante)
        </span>
      </p>
      {confidence.consistencyHint ? (
        <p className="impetus-sys-health__confidence-note">{confidence.consistencyHint}</p>
      ) : null}
    </div>
  );
}

function SystemNarrativeSection({ payload, primaryAlert }) {
  const prose = useMemo(
    () => buildSystemNarrative(payload, primaryAlert),
    [payload, primaryAlert]
  );
  if (!prose) return null;

  return (
    <section
      className="impetus-sys-health__section impetus-sys-health__narrative"
      aria-labelledby="sys-health-narrative-title"
    >
      <SectionTitle>
        <span id="sys-health-narrative-title">Síntese operacional</span>
      </SectionTitle>
      <p className="impetus-sys-health__narrative-prose">{prose}</p>
    </section>
  );
}

function SystemInsightsSection({ payload }) {
  const items = useMemo(() => buildSystemInsights(payload), [payload]);
  if (!items.length) return null;

  return (
    <section className="impetus-sys-health__section impetus-sys-health__insights" aria-labelledby="sys-health-insights-title">
      <SectionTitle>
        <span id="sys-health-insights-title">Insights do Sistema</span>
      </SectionTitle>
      <ul className="impetus-sys-health__insights-list">
        {items.map((it) => (
          <li
            key={it.id}
            className="impetus-sys-health__insights-item"
            data-level={it.level}
          >
            <span className="impetus-sys-health__insights-icon" aria-hidden>
              {INSIGHT_ICONS[it.level] || 'ℹ️'}
            </span>
            <span className="impetus-sys-health__insights-text">{it.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusRow({ presentation }) {
  const sem = semanticFromToken(presentation.key);
  return (
    <div className="impetus-sys-health__row">
      <span>Status</span>
      <span
        className="impetus-sys-health__badge"
        style={{
          background: `${sem.color}22`,
          color: sem.color,
          border: `1px solid ${sem.color}44`
        }}
      >
        {presentation.label}
      </span>
    </div>
  );
}

function StabilityBlock({ presentation, stability }) {
  const sem = semanticFromToken(presentation.key);
  return (
    <div>
      <div className="impetus-sys-health__row">
        <span>Estabilidade</span>
        <span className="impetus-sys-health__mono">{Math.round(stability * 100)}%</span>
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
            background: sem.color
          }}
        />
      </div>
    </div>
  );
}

const ISSUE_LABELS = {
  decisionMismatch: 'Decisão facade ≠ unificada',
  badHighScore: 'Alta confiança com outcome negativo',
  fallbackMismatch: 'Inconsistência de fallback',
  escalationMismatch: 'Inconsistência de escalação cognitiva'
};

function severityLabel(raw) {
  const s = raw != null ? String(raw).toLowerCase() : '';
  if (s === 'high') return 'alta';
  if (s === 'medium') return 'média';
  if (s === 'normal') return 'normal';
  return raw != null ? String(raw) : '—';
}

function OperationalCard({ title, valueMain, interpretation, sem }) {
  const s = semanticFromToken(sem.token);
  return (
    <div
      className="impetus-sys-health__card"
      style={{ borderLeftColor: s.color }}
      role="group"
      aria-label={title}
    >
      <div className="impetus-sys-health__card-title">{title}</div>
      <div className="impetus-sys-health__card-value" style={{ color: s.color }}>
        {valueMain}
      </div>
      <p className="impetus-sys-health__card-hint">{interpretation}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="impetus-sys-health__section-title">{children}</h3>;
}

function VisaoOperacional({ payload, user }) {
  const h = payload?.health;
  const m = payload?.metrics && typeof payload.metrics === 'object' ? payload.metrics : {};
  const sis = payload?.system_influence_summary;
  const full = userSeesFullHealthPayload(user);

  const dq = h?.decision_quality;
  const avgScore = m.avg_score;
  let qualityCard = null;
  if (full && Number.isFinite(Number(dq))) {
    const cls = classifyDecisionQuality(dq);
    const pct = pct01(dq);
    const avgPct = pct01(avgScore);
    const semTok = cls ? cls.token : 'unknown';
    const hasAvg =
      avgPct != null && Number.isFinite(Number(avgScore)) && Number(avgScore) > 0;
    const interp = hasAvg
      ? `${cls.text} — confiança média na janela: ${avgPct}%.`
      : `${cls.text}.`;
    qualityCard = (
      <OperationalCard
        title="Qualidade"
        valueMain={`${cls.label} (${pct}%)`}
        interpretation={interp}
        sem={semanticFromToken(semTok)}
      />
    );
  }

  const pu = m.pipeline_usage && typeof m.pipeline_usage === 'object' ? m.pipeline_usage : null;
  const g = pu ? Number(pu.gpt) || 0 : 0;
  const c = pu ? Number(pu.cognitive) || 0 : 0;
  const totPipe = g + c;
  let cognitivePct = null;
  if (totPipe > 0) cognitivePct = Math.round((c / totPipe) * 1000) / 10;
  else {
    const cur = Number(h?.cognitive_usage);
    if (Number.isFinite(cur) && cur >= 0) cognitivePct = Math.round(cur * 1000) / 10;
    else {
      const rate = Number(m.cognitive_usage_rate);
      if (Number.isFinite(rate)) cognitivePct = Math.round(rate * 1000) / 10;
    }
  }

  let usageCard;
  if (cognitivePct != null) {
    const predominant = cognitivePct > 50 ? 'predominante' : cognitivePct < 50 ? 'minoritário' : 'equilibrado';
    const sem = cognitivePct >= 50 ? 'good' : cognitivePct >= 35 ? 'warning' : 'warning';
    usageCard = (
      <OperationalCard
        title="Uso do sistema"
        valueMain={`Uso cognitivo: ${cognitivePct}% (${predominant})`}
        interpretation={
          totPipe > 0
            ? `Na janela: ${c} rotas cognitivas · ${g} rotas GPT.`
            : 'Proporção estimada a partir das métricas disponíveis.'
        }
        sem={semanticFromToken(sem)}
      />
    );
  } else {
    usageCard = (
      <OperationalCard
        title="Uso do sistema"
        valueMain="—"
        interpretation="Ainda sem dados de roteamento na janela."
        sem={semanticFromToken('unknown')}
      />
    );
  }

  const lat = m.avg_latency && typeof m.avg_latency === 'object' ? m.avg_latency : {};
  const gptMs = Number(lat.gpt);
  const cogMs = Number(lat.cognitive);
  const clsGpt = classifyLatencyMs(gptMs);
  const clsCog = classifyLatencyMs(cogMs);
  const perfSem =
    clsGpt.token === 'critical' || clsCog.token === 'critical'
      ? 'critical'
      : clsGpt.token === 'warning' || clsCog.token === 'warning'
        ? 'warning'
        : clsGpt.token === 'good' || clsCog.token === 'good'
          ? 'good'
          : 'unknown';

  const performanceCard = (
    <OperationalCard
      title="Performance (latência média)"
      valueMain={
        <span className="impetus-sys-health__card-value-stack">
          <span>
            GPT:{' '}
            <strong className="impetus-sys-health__mono">
              {Number.isFinite(gptMs) && gptMs > 0 ? `${Math.round(gptMs)} ms` : '—'}
            </strong>{' '}
            <span className="impetus-sys-health__pill" data-tone={clsGpt.token}>
              {clsGpt.label}
            </span>
          </span>
          <span>
            Cognitivo:{' '}
            <strong className="impetus-sys-health__mono">
              {Number.isFinite(cogMs) && cogMs > 0 ? `${Math.round(cogMs)} ms` : '—'}
            </strong>{' '}
            <span className="impetus-sys-health__pill" data-tone={clsCog.token}>
              {clsCog.label}
            </span>
          </span>
        </span>
      }
      interpretation={`GPT: ${clsGpt.text}. Cognitivo: ${clsCog.text}.`}
      sem={semanticFromToken(perfSem)}
    />
  );

  const hr = sis && Number.isFinite(Number(sis.high_risk_rate)) ? Number(sis.high_risk_rate) : null;
  const riskCls = hr != null ? classifyHighRiskRate(hr) : null;
  const riskCard = (
    <OperationalCard
      title="Risco operacional"
      valueMain={
        hr != null
          ? `${riskCls.label} — ${Math.round(hr * 1000) / 10}% (amostras influência)`
          : '—'
      }
      interpretation={riskCls ? riskCls.text : 'Sem resumo de influência do sistema nesta janela.'}
      sem={semanticFromToken(riskCls ? riskCls.token : 'unknown')}
    />
  );

  const td = m.total_decisions;
  const volCard =
    full && Number.isFinite(Number(td)) && Number(td) >= 0 ? (
      <OperationalCard
        title="Volume de decisões"
        valueMain={`${Number(td).toLocaleString('pt-PT')} decisões processadas na janela atual`}
        interpretation="Contagem de eventos de decisão no agregador em memória."
        sem={semanticFromToken(Number(td) > 0 ? 'good' : 'unknown')}
      />
    ) : null;

  return (
    <section className="impetus-sys-health__section" aria-labelledby="sys-health-op-title">
      <SectionTitle>
        <span id="sys-health-op-title">Visão operacional do sistema</span>
      </SectionTitle>
      <div className="impetus-sys-health__card-grid">
        {qualityCard}
        {usageCard}
        {performanceCard}
        {riskCard}
        {volCard}
      </div>
    </section>
  );
}

function AuditoriaTecnica({ payload }) {
  const h = payload?.health;
  const m = payload?.metrics && typeof payload.metrics === 'object' ? payload.metrics : {};
  const v = h?.validation && typeof h.validation === 'object' ? h.validation : {};

  const audits = Array.isArray(payload?.recent_audits) ? [...payload.recent_audits] : [];
  audits.sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0));
  const top = audits.slice(0, 20);

  const errR = classifyRateThreshold(v.error_rate);
  const hiR = classifyRateThreshold(v.high_confidence_failure_rate);

  const bufSize = m.buffer_size;
  const bufMax = m.window_max;
  let bufferInterpretation = '—';
  let bufferSem = 'unknown';
  if (Number.isFinite(Number(bufSize)) && Number.isFinite(Number(bufMax)) && Number(bufMax) > 0) {
    const pct = Math.round((Number(bufSize) / Number(bufMax)) * 1000) / 10;
    bufferInterpretation = `Uso do buffer: ${Number(bufSize)} / ${Number(bufMax)} (${pct}%)`;
    bufferSem = pct > 85 ? 'critical' : pct > 60 ? 'warning' : 'good';
  }

  return (
    <section className="impetus-sys-health__section" aria-labelledby="sys-health-audit-title">
      <SectionTitle>
        <span id="sys-health-audit-title">Auditoria técnica do sistema</span>
      </SectionTitle>

      <div className="impetus-sys-health__card-grid impetus-sys-health__card-grid--dense">
        <div className="impetus-sys-health__card impetus-sys-health__card--wide">
          <div className="impetus-sys-health__card-title">Validação (resumo)</div>
          <div className="impetus-sys-health__row impetus-sys-health__row--block">
            <span>Taxa de erro</span>
            <span className="impetus-sys-health__mono" style={{ color: semanticFromToken(errR.token).color }}>
              {errR.label}
            </span>
          </div>
          <div className="impetus-sys-health__row impetus-sys-health__row--block">
            <span>Falhas com alta confiança</span>
            <span className="impetus-sys-health__mono" style={{ color: semanticFromToken(hiR.token).color }}>
              {hiR.label}
            </span>
          </div>
        </div>

        <OperationalCard
          title="Buffers (janela em memória)"
          valueMain={bufferInterpretation}
          interpretation="Indica quanto da janela de métricas está preenchida antes do descarte FIFO."
          sem={semanticFromToken(bufferSem)}
        />
      </div>

      <div className="impetus-sys-health__audit-list-wrap">
        <div className="impetus-sys-health__card-title">Registos de auditoria recentes</div>
        <p className="impetus-sys-health__card-hint">Até 20 eventos, mais recentes primeiro. Sem dados técnicos brutos.</p>
        {top.length === 0 ? (
          <p className="impetus-sys-health__muted">Nenhum registo na janela ou auditoria desativada no ambiente.</p>
        ) : (
          <ul className="impetus-sys-health__audit-list">
            {top.map((row, idx) => {
              const ts = row.ts != null ? new Date(Number(row.ts)).toLocaleString('pt-PT') : '—';
              const ok = row.audit_ok !== false;
              const sev = severityLabel(row.severity);
              const issues = row.issues && typeof row.issues === 'object' ? row.issues : {};
              const active = Object.keys(ISSUE_LABELS).filter((k) => issues[k] === true);
              const problemLabel =
                active.length > 0
                  ? active.map((k) => ISSUE_LABELS[k] || k).join(' · ')
                  : ok
                    ? 'Sem inconsistências detetadas'
                    : 'Revisão recomendada';
              return (
                <li key={`${row.unified_decision_id || 'na'}-${row.ts || idx}`} className="impetus-sys-health__audit-item">
                  <div className="impetus-sys-health__audit-item-head">
                    <span className="impetus-sys-health__mono">{ts}</span>
                    <span className="impetus-sys-health__pill" data-tone={ok ? 'good' : 'critical'}>
                      {ok ? 'OK' : 'FALHA'}
                    </span>
                    <span
                      className="impetus-sys-health__pill"
                      data-tone={
                        sev === 'alta'
                          ? 'critical'
                          : sev === 'média'
                            ? 'warning'
                            : sev === 'normal'
                              ? 'good'
                              : 'unknown'
                      }
                    >
                      Severidade: {sev}
                    </span>
                  </div>
                  <div className="impetus-sys-health__audit-item-body">{problemLabel}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function HealthBody({
  user,
  payload,
  presentation,
  stability,
  fallbackPct,
  advancedMode,
  setAdvancedMode
}) {
  const sis = payload?.system_influence_summary;
  const influenceActive =
    sis &&
    sis.samples > 0 &&
    ((sis.priority_override_rate || 0) > 0.02 || (sis.high_risk_rate || 0) > 0.02);

  const canAdv = userCanAdvancedAudit(user);
  const primaryAlert = useMemo(() => (payload ? computePrimaryAlert(payload) : null), [payload]);
  const analysisConfidence = useMemo(
    () => (payload ? computeAnalysisConfidence(payload) : null),
    [payload]
  );

  return (
    <>
      {influenceActive && (
        <div className="impetus-sys-health__influence" role="status">
          <div>
            <span className="impetus-sys-health__influence-pulse" aria-hidden />
            Sistema sugerindo intervenção
          </div>
          <span className="impetus-sys-health__influence-meta">
            Influência ativa: prioridade elevada {Math.round((sis.priority_override_rate || 0) * 100)}% · risco alto{' '}
            {Math.round((sis.high_risk_rate || 0) * 100)}% (janela recente)
          </span>
        </div>
      )}

      <div className="impetus-sys-health__block">
        <SectionTitle>Resumo executivo</SectionTitle>
        <StatusRow presentation={presentation} />
        <StabilityBlock presentation={presentation} stability={stability} />
        <div className="impetus-sys-health__row">
          <span>Aprendizado</span>
          <span>{learningLabel(payload?.health?.learning_status)}</span>
        </div>
        <div className="impetus-sys-health__row">
          <span>Taxa de fallback</span>
          <span className="impetus-sys-health__mono">{fallbackPct != null ? `${fallbackPct}%` : '—'}</span>
        </div>
      </div>

      {payload && <GlobalHealthCard payload={payload} />}

      {payload && <PrimaryAlertBanner alert={primaryAlert} />}

      {payload && <AnalysisConfidenceStrip confidence={analysisConfidence} />}

      {payload && <SystemNarrativeSection payload={payload} primaryAlert={primaryAlert} />}

      {payload && <VisaoOperacional payload={payload} user={user} />}

      {payload && <SystemTrendSection payload={payload} />}

      {payload && <SystemInsightsSection payload={payload} />}

      {canAdv && (
        <div className="impetus-sys-health__advanced-toggle">
          <label className="impetus-sys-health__toggle-label">
            <input
              type="checkbox"
              className="impetus-sys-health__toggle-input"
              checked={advancedMode}
              onChange={(e) => setAdvancedMode(e.target.checked)}
            />
            <span>Modo avançado (auditoria técnica)</span>
          </label>
        </div>
      )}

      {canAdv && advancedMode && payload && <AuditoriaTecnica payload={payload} />}
    </>
  );
}

export default function SystemHealthPanel({ embedded = false }) {
  const location = useLocation();
  const [access, setAccess] = useState(() => readAccessSnapshot());
  const [payload, setPayload] = useState(null);
  const [apiForbidden, setApiForbidden] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const user = useMemo(() => parseUser(), [location.pathname]);

  // Admin nível 1: visibilidade total por defeito (incluindo Auditoria Técnica)
  const [advancedMode, setAdvancedMode] = useState(() => userCanAdvancedAudit(parseUser()));

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
      setApiForbidden(false);
      if (data && data.ok) {
        setPayload(data);
      }
    } catch (err) {
      const st = err && err.response && err.response.status;
      if (st === 403) setApiForbidden(true);
      /* outros erros: não bloquear UI nem mostrar detalhe técnico */
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
    if (!payload?.health) {
      return { key: 'unknown', label: statusPresentation.unknown.label, ...semanticFromToken('unknown') };
    }
    const h = payload.health;
    const full = userSeesFullHealthPayload(user);
    const statusRaw = full ? h.system_health ?? h.status : h.status ?? h.system_health;
    const key = normalizeStatusKey(statusRaw);
    const preset = statusPresentation[key] || statusPresentation.unknown;
    const sem = semanticFromToken(key);
    return { key, label: preset.label, ...sem };
  }, [payload, user]);

  const stability = useMemo(() => {
    const v = Number(payload?.health?.stability_score);
    if (!Number.isFinite(v)) return 0;
    return Math.min(1, Math.max(0, v));
  }, [payload]);

  if (!access.allowed) return null;

  const fr = Number(payload?.metrics?.fallback_rate);
  const fallbackPct = Number.isFinite(fr) ? Math.round(fr * 1000) / 10 : null;

  const showBody = embedded || expanded;

  return (
    <aside
      className={`impetus-sys-health${embedded ? ' impetus-sys-health--embedded' : ' impetus-sys-health--lateral'}${embedded || expanded ? '' : ' impetus-sys-health--collapsed'}`}
      aria-label="Saúde do sistema cognitivo"
    >
      {!embedded && (
        <div className="impetus-sys-health__head">
          <span
            className="impetus-sys-health__dot"
            style={{ color: presentation.color, background: presentation.color }}
          />
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
          {apiForbidden ? (
            <p className="impetus-sys-health__muted" role="alert">
              O servidor negou o acesso a estas métricas para o seu papel. Peça ao administrador IMPETUS ou utilize uma
              conta com permissão técnica (admin / liderança autorizada).
            </p>
          ) : (
            <>
              <HealthBody
                user={user}
                payload={payload}
                presentation={presentation}
                stability={stability}
                fallbackPct={fallbackPct}
                advancedMode={advancedMode}
                setAdvancedMode={setAdvancedMode}
              />
              {!payload && <p className="impetus-sys-health__muted">A aguardar dados…</p>}
            </>
          )}
        </div>
      )}
    </aside>
  );
}
