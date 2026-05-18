import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { isEnvironmentOperationalRuntimeEnabled } from './environmentOperationalFeatureFlags.js';
import { WaterOperationalHub } from './water/WaterOperationalHub.jsx';
import { EffluentOperationalHub, EffluentIncidentWorkspace } from './effluent/EffluentOperationalHub.jsx';
import { EmissionsOperationalHub } from './emissions/EmissionsOperationalHub.jsx';
import { WasteOperationalHub } from './waste/WasteOperationalHub.jsx';
import { EnvironmentalFieldHub } from './field/EnvironmentalFieldHub.jsx';

const VIEW_MAP = {
  water: WaterOperationalHub,
  effluent: EffluentOperationalHub,
  emissions: EmissionsOperationalHub,
  waste: WasteOperationalHub,
  field: EnvironmentalFieldHub
};

export function EnvironmentOperationalViewRouter({ hubOnly = false }) {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');

  if (!isEnvironmentOperationalRuntimeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase' }}>
          Runtime operacional ambiental desligado (shadow)
        </p>
        <Link to="/app" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar
        </Link>
      </div>
    );
  }

  if (view === 'effluent-nc') {
    return <EffluentIncidentWorkspace />;
  }

  const Comp = view ? VIEW_MAP[view] : null;
  if (Comp) return <Comp />;

  if (hubOnly) return null;

  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Selecione uma área operacional no hub.</p>
    </div>
  );
}
