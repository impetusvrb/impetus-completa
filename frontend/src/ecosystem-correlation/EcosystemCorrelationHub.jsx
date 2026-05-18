import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEcosystemCorrelationPack } from './ecosystemCorrelationApi.js';
import { EcosystemHeatmapWorkspace } from './EcosystemHeatmapWorkspace.jsx';
import { EcosystemRiskCorrelationWorkspace } from './EcosystemRiskCorrelationWorkspace.jsx';
import { EcosystemOperationalImpactWorkspace } from './EcosystemOperationalImpactWorkspace.jsx';
import { EcosystemExecutiveNarrativeWorkspace } from './EcosystemExecutiveNarrativeWorkspace.jsx';

export default function EcosystemCorrelationHub() {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchEcosystemCorrelationPack({
        signals: {
          production_rate: 120,
          emissions_co2: 45,
          scrap_tonnes: 2,
          fleet_km: 800,
          failure_count: 1
        }
      });
      if (alive) {
        setPack(data);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Consolidando correlação enterprise…
      </p>
    );
  }

  if (!pack) {
    return (
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)' }}>Pacote de correlação indisponível.</p>
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar
        </Link>
      </div>
    );
  }

  const exec = pack.executive || {};
  const impacts = pack.operational?.operational_impacts || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 20, textTransform: 'uppercase', color: 'var(--text-accent)' }}>
          Ecossistema — Correlação Industrial
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          Q · S · L · E · produção · manutenção · shadow-first · assistivo
        </p>
      </header>

      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cyan)' }}>
          Densidade {(pack.ecosystem_cross_domain_density_score * 100).toFixed(0)}% · Pressão operacional{' '}
          {(pack.ecosystem_operational_pressure_score * 100).toFixed(0)}% · Readiness{' '}
          {(pack.ecosystem_cross_domain_readiness * 100).toFixed(0)}%
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
          Validação: {pack.validation?.ok ? 'OK' : 'REVISAR'} · auto_promotion: false
        </p>
      </div>

      <EcosystemHeatmapWorkspace heatmap={exec.heatmap} />
      <EcosystemRiskCorrelationWorkspace riskMap={exec.risk_map} />
      <EcosystemOperationalImpactWorkspace impacts={impacts} />
      <EcosystemExecutiveNarrativeWorkspace narratives={exec.narratives} />

      <Link to="/app/environment/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4 }}>
        Voltar ao hub ambiental
      </Link>
    </div>
  );
}
