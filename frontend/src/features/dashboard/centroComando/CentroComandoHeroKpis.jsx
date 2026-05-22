/**
 * Linha principal de KPIs críticos — leitura executiva rápida (dados reais /api).
 */
import React, { useEffect, useState, useMemo } from 'react';
import { dashboard } from '../../../services/api';
import { AlertTriangle, Brain, MessageSquare, Target, TrendingUp, Zap } from 'lucide-react';
import IndustrialMiniGauge from './IndustrialMiniGauge';

function HeroKpiCard({ icon: Icon, label, value, unit, tone = 'cyan', gaugePct, sub }) {
  return (
    <article className={`cc-hero-kpi cc-hero-kpi--${tone}`}>
      <div className="cc-hero-kpi__top">
        <Icon size={16} className="cc-hero-kpi__icon" />
        <span className="cc-hero-kpi__label">{label}</span>
      </div>
      <div className="cc-hero-kpi__body">
        {gaugePct != null && (
          <IndustrialMiniGauge
            value={gaugePct}
            color={
              tone === 'green'
                ? 'var(--green)'
                : tone === 'amber'
                  ? 'var(--amber)'
                  : tone === 'red'
                    ? 'var(--red)'
                    : 'var(--cyan)'
            }
          />
        )}
        <div className="cc-hero-kpi__values">
          <strong className="cc-hero-kpi__value">{value}</strong>
          {unit && <span className="cc-hero-kpi__unit">{unit}</span>}
          {sub && <span className="cc-hero-kpi__sub">{sub}</span>}
        </div>
      </div>
    </article>
  );
}

export default function CentroComandoHeroKpis({ hrDashboard = false }) {
  const [summary, setSummary] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      dashboard.getSummary().catch(() => null),
      dashboard.getKPIs().catch(() => null)
    ])
      .then(([sRes, kRes]) => {
        if (cancelled) return;
        setSummary(sRes?.data?.summary || null);
        setKpis(Array.isArray(kRes?.data?.kpis) ? kRes.data.kpis : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    const inter = summary?.operational_interactions?.total ?? 0;
    const interGrowth = summary?.operational_interactions?.growth_percentage ?? 0;
    const insights = summary?.ai_insights?.total ?? 0;
    const alertsCrit = summary?.alerts?.critical ?? 0;
    const proposals = summary?.proposals?.total ?? 0;
    const healthScore = Math.min(100, Math.max(0, 88 - alertsCrit * 12 + (interGrowth > 0 ? 4 : 0)));
    const iaScore = Math.min(100, Math.max(0, 70 + Math.min(insights, 20)));

    if (hrDashboard) {
      return [
        {
          icon: Target,
          label: 'SAÚDE OPERACIONAL RH',
          value: `${healthScore}`,
          unit: 'score',
          tone: 'green',
          gaugePct: healthScore,
          sub: 'índice composto'
        },
        {
          icon: AlertTriangle,
          label: 'ALERTAS ATIVOS',
          value: String(alertsCrit),
          unit: 'críticos',
          tone: alertsCrit > 0 ? 'red' : 'cyan',
          gaugePct: Math.min(100, alertsCrit * 25),
          sub: 'requer atenção'
        },
        {
          icon: MessageSquare,
          label: 'COMUNICAÇÃO ATIVA',
          value: String(inter),
          unit: 'interações',
          tone: 'cyan',
          gaugePct: Math.min(100, inter / 2),
          sub: interGrowth ? `${interGrowth > 0 ? '+' : ''}${interGrowth}%` : 'semana'
        },
        {
          icon: Brain,
          label: 'SCORE IA',
          value: String(iaScore),
          unit: 'cognitivo',
          tone: 'cyan',
          gaugePct: iaScore,
          sub: `${insights} insights`
        },
        {
          icon: TrendingUp,
          label: 'PROPOSTAS EM ABERTO',
          value: String(proposals),
          unit: 'itens',
          tone: 'amber',
          gaugePct: Math.min(100, proposals * 8),
          sub: 'pró-ação'
        },
        {
          icon: Zap,
          label: 'EFICIÊNCIA OPERACIONAL',
          value: kpis[0]?.value != null ? String(kpis[0].value) : '—',
          unit: kpis[0]?.title?.slice(0, 18) || 'KPI contextual',
          tone: 'green',
          gaugePct: typeof kpis[0]?.value === 'number' ? Math.min(100, kpis[0].value) : 72,
          sub: 'perfil RH'
        }
      ];
    }

    return [
      {
        icon: Zap,
        label: 'EFICIÊNCIA OPERACIONAL',
        value: `${healthScore}`,
        unit: 'índice',
        tone: 'green',
        gaugePct: healthScore,
        sub: 'saúde do turno'
      },
      {
        icon: AlertTriangle,
        label: 'ALERTAS ATIVOS',
        value: String(alertsCrit),
        unit: 'críticos',
        tone: alertsCrit > 0 ? 'red' : 'cyan',
        gaugePct: Math.min(100, alertsCrit * 20),
        sub: 'tempo real'
      },
      {
        icon: Target,
        label: 'TAREFAS CRÍTICAS',
        value: String(proposals),
        unit: 'propostas',
        tone: 'amber',
        gaugePct: Math.min(100, proposals * 10),
        sub: 'pendências'
      },
      {
        icon: TrendingUp,
        label: 'SAÚDE OPERACIONAL',
        value: String(inter),
        unit: 'interações',
        tone: 'cyan',
        gaugePct: Math.min(100, inter / 3),
        sub: `${interGrowth >= 0 ? '+' : ''}${interGrowth}%`
      },
      {
        icon: Brain,
        label: 'SCORE IA',
        value: String(iaScore),
        unit: 'cognitivo',
        tone: 'cyan',
        gaugePct: iaScore,
        sub: `${insights} insights`
      },
      {
        icon: MessageSquare,
        label: 'COMUNICAÇÃO ATIVA',
        value: String(inter),
        unit: 'canal',
        tone: 'green',
        gaugePct: Math.min(100, 40 + interGrowth),
        sub: 'operacional'
      }
    ];
  }, [summary, kpis, hrDashboard]);

  if (loading) {
    return (
      <section className="cc-hero-kpis cc-hero-kpis--loading" aria-busy="true">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="cc-hero-kpi cc-hero-kpi--skeleton" />
        ))}
      </section>
    );
  }

  return (
    <section className="cc-hero-kpis" aria-label="KPIs críticos">
      {cards.map((c) => (
        <HeroKpiCard key={c.label} {...c} />
      ))}
    </section>
  );
}
