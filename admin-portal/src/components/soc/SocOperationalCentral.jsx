import React from 'react';
import {
  IconShield,
  IconAlert,
  IconBan,
  IconRadar,
  IconHammer,
  IconLock,
  IconPlay,
  IconCircuit,
  IconNetwork,
  IconActivity,
} from './socIcons';
import { isBusyOp } from '../../utils/legacyDashboardUtils';

function CentralSection({ title, icon, children }) {
  return (
    <section className="soc-central-section">
      <h3 className="soc-central-section-title">
        <span className="soc-central-section-icon">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function CentralAction({ label, meta, onClick, disabled }) {
  return (
    <button type="button" className="soc-central-action" onClick={onClick} disabled={disabled}>
      <span className="soc-central-action-label">{label}</span>
      {meta && <span className="soc-central-action-meta">{meta}</span>}
    </button>
  );
}

function EnterpriseCard({ icon, title, summary, children, accent }) {
  return (
    <article className="soc-enterprise-card" style={{ borderLeftColor: accent || 'var(--cyan)' }}>
      <header className="soc-enterprise-card-header">
        <span className="soc-enterprise-card-icon" style={{ color: accent || 'var(--cyan)' }}>{icon}</span>
        <strong className="soc-enterprise-card-title">{title}</strong>
      </header>
      {summary && <p className="soc-enterprise-card-summary">{summary}</p>}
      {children}
    </article>
  );
}

export default function SocOperationalCentral({
  score,
  risk,
  soc,
  summary,
  hardeningPending,
  promotionQueue,
  sec01Count,
  correlationCount,
  twin,
  sim,
  vault,
  predictive,
  busyOp,
  onSimulation,
  onScrollTo,
  onOpenDrawer,
}) {
  const simBusy = isBusyOp(busyOp, 'simulation', '', 'run');
  const promoCount = (promotionQueue || []).length;

  return (
    <div className="soc-operational-central">
      <CentralSection title="Postura" icon={<IconShield size={14} />}>
        <p className="soc-central-stat-line">
          Score <strong style={{ color: 'var(--cyan)' }}>{score?.total ?? '—'}</strong>
          {' / 1000 · '}
          {score?.pct ?? 0}% maturidade
        </p>
        {risk?.level != null && (
          <p className="soc-central-stat-line muted">
            Risco L{risk.level} — {risk.name || 'Normal'}
          </p>
        )}
        <CentralAction label="Ver postura completa" meta="Scroll para secção" onClick={() => onScrollTo('sec-postura')} />
      </CentralSection>

      <CentralSection title="Ameaças" icon={<IconAlert size={14} />}>
        <p className="soc-central-stat-line">
          <strong style={{ color: 'var(--red)' }}>{summary.critical_open ?? 0}</strong> críticos ·{' '}
          <strong style={{ color: 'var(--amber)' }}>{summary.alerts_24h ?? 0}</strong> alertas 24h
        </p>
        <CentralAction label="Prioridade de ameaças" onClick={() => onScrollTo('sec-criticos')} />
        <CentralAction
          label="Explorar críticos"
          meta="Drawer"
          disabled={!(summary.critical_open > 0)}
          onClick={() => onOpenDrawer('critical-events')}
        />
      </CentralSection>

      <CentralSection title="Defesas" icon={<IconBan size={14} />}>
        <p className="soc-central-stat-line">
          <strong>{summary.blocked_ips_total ?? 0}</strong> IPs bloqueados ·{' '}
          <strong style={{ color: 'var(--amber)' }}>{hardeningPending}</strong> hardening pendente
        </p>
        <CentralAction label="Investigação — IPs" onClick={() => onScrollTo('sec-investigacao')} />
        <CentralAction
          label="Fila hardening SEC-11"
          disabled={hardeningPending <= 0}
          onClick={() => onOpenDrawer('hardening')}
        />
      </CentralSection>

      <CentralSection title="Inteligência" icon={<IconRadar size={14} />}>
        <p className="soc-central-stat-line">
          <strong>{soc.open_incidents ?? 0}</strong> incidentes ·{' '}
          <strong>{correlationCount}</strong> correlacionados ·{' '}
          <strong>{sec01Count}</strong> detecções SEC-01
        </p>
        <CentralAction label="Inteligência de ameaças" onClick={() => onScrollTo('sec-intel')} />
      </CentralSection>

      <CentralSection title="Acção humana" icon={<IconHammer size={14} />}>
        <p className="soc-central-stat-line">
          SEC-11: <strong style={{ color: 'var(--amber)' }}>{hardeningPending}</strong> · Assist:{' '}
          <strong style={{ color: '#b44dff' }}>{promoCount}</strong>
        </p>
        <CentralAction label="Acção humana necessária" onClick={() => onScrollTo('sec-humana')} />
        <CentralAction
          label="Promoção SEC-14…18"
          disabled={promoCount <= 0}
          onClick={() => onOpenDrawer('promotion')}
        />
      </CentralSection>

      <CentralSection title="Ferramentas enterprise" icon={<IconNetwork size={14} />}>
        <div className="soc-enterprise-grid">
          <EnterpriseCard
            icon={<IconNetwork size={16} />}
            title="Gêmeo digital"
            summary={`Prod ${twin.production?.online ?? 0}/${twin.production?.total ?? 3} · Lab ${twin.homolog_lab?.online ?? 0}/${twin.homolog_lab?.total ?? 5}`}
            accent={twin.parity?.twin_ready ? 'var(--green)' : 'var(--amber)'}
          >
            <ul className="soc-enterprise-list">
              {(twin.production?.processes || []).slice(0, 4).map((p) => (
                <li key={p.name}>{p.name}: {p.status}</li>
              ))}
            </ul>
          </EnterpriseCard>

          <EnterpriseCard
            icon={<IconPlay size={16} />}
            title="Simulador SEC-19"
            summary={sim.status === 'not_run' ? (sim.message || 'Não executado') : `Score ${sim.operational_score ?? '—'} · ${sim.scenarios_total ?? 0} cenários`}
            accent="var(--cyan)"
          >
            <button type="button" className="btn btn-ghost soc-enterprise-run" disabled={simBusy} onClick={onSimulation}>
              {simBusy ? 'A correr…' : 'Executar simulação'}
            </button>
          </EnterpriseCard>

          <EnterpriseCard
            icon={<IconLock size={16} />}
            title="Vault / segredos"
            summary={vault.ok ? 'Inventário OK' : 'Atenção requerida'}
            accent={vault.ok ? 'var(--green)' : 'var(--red)'}
          >
            <ul className="soc-enterprise-list">
              {(vault.inventory || []).map((s) => (
                <li key={s.name} style={{ color: s.present && s.secure ? 'var(--green)' : 'var(--amber)' }}>
                  {s.present && s.secure ? '✓' : '○'} {s.name}
                </li>
              ))}
            </ul>
          </EnterpriseCard>

          <EnterpriseCard
            icon={<IconCircuit size={16} />}
            title="IA preditiva SEC-10"
            summary={`Nível ${predictive.threat_level || '—'} · ${predictive.current_mode || predictive.mode || 'observe'}`}
            accent="#b44dff"
          >
            {(predictive.pre_warm || []).length === 0 ? (
              <p className="muted soc-central-stat-line">Sem pre-warm recomendado.</p>
            ) : (
              <ul className="soc-enterprise-list">
                {predictive.pre_warm.slice(0, 3).map((a) => (
                  <li key={a.action}>{a.label}</li>
                ))}
              </ul>
            )}
          </EnterpriseCard>
        </div>
      </CentralSection>
    </div>
  );
}
