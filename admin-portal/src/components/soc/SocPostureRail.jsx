import React from 'react';
import { IconShield, IconAlert, IconGlobe, IconBan, IconRadar } from './socIcons';

function scoreAccent(total) {
  if (total >= 800) return 'var(--green)';
  if (total >= 600) return 'var(--cyan)';
  if (total >= 400) return 'var(--amber)';
  return 'var(--red)';
}

function PostureMetric({ icon, label, value, hint, accent, iconAccent }) {
  return (
    <article className="soc-posture-metric">
      <div className="soc-posture-metric-icon" style={{ color: iconAccent || accent || 'var(--cyan)' }}>
        {icon}
      </div>
      <div className="soc-posture-metric-body">
        <span className="soc-posture-metric-label">{label}</span>
        <span className="soc-posture-metric-value" style={{ color: accent || 'var(--text-primary)' }}>
          {value}
        </span>
        {hint && <span className="soc-posture-metric-hint">{hint}</span>}
      </div>
    </article>
  );
}

export default function SocPostureRail({ score, soc, summary, risk }) {
  const total = score?.total ?? 0;
  const pct = score?.pct ?? 0;
  const accent = scoreAccent(total);

  return (
    <section id="sec-postura" className="soc-posture-rail" aria-label="Postura de segurança">
      <header className="soc-op-domain-header">
        <h2 className="soc-op-domain-title">Postura de segurança</h2>
        {risk?.level != null && (
          <span className="soc-posture-risk-chip">
            L{risk.level} — {risk.name || 'Normal'}
          </span>
        )}
      </header>

      <div className="soc-posture-score-row">
        <div className="soc-posture-score-badge" style={{ borderColor: accent, boxShadow: `0 0 20px ${accent}33` }}>
          <IconShield size={22} />
          <div className="soc-posture-score-numbers">
            <span className="soc-posture-score-total" style={{ color: accent }}>{total}</span>
            <span className="soc-posture-score-denom">/1000 · {pct}% maturidade</span>
          </div>
        </div>
      </div>

      <div className="soc-posture-metrics-grid">
        <PostureMetric
          icon={<IconRadar size={16} />}
          label="Incidentes abertos"
          value={soc.open_incidents ?? 0}
          hint="SEC-02 correlação"
          accent="var(--amber)"
        />
        <PostureMetric
          icon={<IconGlobe size={16} />}
          label="Países activos"
          value={soc.countries_active ?? 0}
          hint={`${soc.events_mapped ?? 0} eventos mapeados`}
        />
        <PostureMetric
          icon={<IconBan size={16} />}
          label="IPs bloqueados"
          value={summary.blocked_ips_total ?? 0}
          hint={`fail2ban ${summary.fail2ban_banned ?? 0} · UFW ${summary.ufw_denies ?? 0}`}
          accent={(summary.blocked_ips_total ?? 0) > 0 ? 'var(--red)' : 'var(--green)'}
        />
        <PostureMetric
          icon={<IconAlert size={16} />}
          label="Alertas 24h"
          value={summary.alerts_24h ?? 0}
          accent="var(--amber)"
        />
        <PostureMetric
          icon={<IconAlert size={16} />}
          label="Eventos críticos"
          value={summary.critical_open ?? 0}
          accent="var(--red)"
          hint="Ameaças activas recentes"
        />
        <PostureMetric
          icon={<IconRadar size={16} />}
          label="Anomalias baseline"
          value={soc.anomalies ?? 0}
          accent={(soc.anomalies ?? 0) > 0 ? 'var(--red)' : 'var(--green)'}
        />
        <PostureMetric
          icon={<IconShield size={16} />}
          label="Logins falhados 24h"
          value={summary.failed_logins_24h ?? 0}
          accent={(summary.failed_logins_24h ?? 0) > 0 ? 'var(--red)' : 'var(--green)'}
        />
        <PostureMetric
          icon={<IconRadar size={16} />}
          label="Risco médio SEC-02"
          value={soc.risk_avg ?? 0}
          accent="var(--cyan)"
        />
      </div>
    </section>
  );
}
