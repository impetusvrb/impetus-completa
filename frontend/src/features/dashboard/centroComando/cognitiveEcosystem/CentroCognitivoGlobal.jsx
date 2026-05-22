import React from 'react';
import useAnimatedMetric from './useAnimatedMetric';

function MetricCell({ label, value, accent, pulse, numeric }) {
  const animated = useAnimatedMetric(numeric != null ? numeric : undefined);
  const display = numeric != null ? `${Math.round(animated)}%` : value;

  return (
    <div className={`cog-metric ${pulse ? 'cog-metric--pulse' : ''}`}>
      <span className="cog-metric__label">{label}</span>
      <span className={`cog-metric__value cog-metric__value--${accent || 'cyan'}`}>{display}</span>
    </div>
  );
}

export default function CentroCognitivoGlobal({ centro, status }) {
  if (!centro) return null;
  const active = status === 'ANALISANDO' || status === 'ANALYZING';

  return (
    <section className="cog-nucleus" aria-label="Centro Cognitivo IMPETUS">
      <header className="cog-nucleus__head">
        <div className="cog-nucleus__title-row">
          <span className="cog-nucleus__dot" aria-hidden />
          <h2 className="cog-nucleus__title">CENTRO COGNITIVO IMPETUS</h2>
          <span className={`cog-nucleus__status cog-nucleus__status--${active ? 'live' : 'warn'}`}>
            {status || 'SINCRONIZANDO'}
          </span>
        </div>
        <p className="cog-nucleus__sub">Cérebro operacional · consciência organizacional · monitoramento contínuo</p>
        <div className="cog-nucleus__deltas">
          <span className="cog-nucleus__delta cog-nucleus__delta--up">
            Produtividade {(centro.productivity_delta_pct > 0 ? '+' : '') + (centro.productivity_delta_pct ?? 1.2)}%
          </span>
          <span className="cog-nucleus__delta cog-nucleus__delta--down">
            Interação {centro.interaction_delta_pct ?? -0.8}%
          </span>
          <span className="cog-nucleus__delta">Risco Δ {centro.risk_delta > 0 ? '+' : ''}{centro.risk_delta?.toFixed?.(1) ?? centro.risk_delta}</span>
        </div>
      </header>
      <div className="cog-nucleus__grid">
        <MetricCell
          label="Eficiência global"
          numeric={centro.global_efficiency_pct}
          accent="green"
          pulse={active}
        />
        <MetricCell
          label="Risco operacional"
          value={centro.operational_risk}
          accent={centro.operational_risk === 'Alto' ? 'red' : centro.operational_risk === 'Médio' ? 'amber' : 'green'}
          pulse={active}
        />
        <MetricCell label="Confiança IA" numeric={centro.ia_confidence_pct} accent="cyan" pulse />
        <MetricCell label="Clima organizacional" value={centro.organizational_climate} accent="cyan" />
        <MetricCell label="Clima operacional" value={centro.operational_climate} accent="cyan" />
        <MetricCell label="Gargalo principal" value={centro.active_bottleneck} accent="amber" />
        <MetricCell label="Setor mais crítico" value={centro.most_critical_sector} accent="red" />
        <MetricCell
          label="Tensão operacional"
          value={centro.operational_risk_score >= 65 ? 'Elevada' : centro.operational_risk_score >= 35 ? 'Moderada' : 'Baixa'}
          accent="amber"
        />
      </div>
    </section>
  );
}
