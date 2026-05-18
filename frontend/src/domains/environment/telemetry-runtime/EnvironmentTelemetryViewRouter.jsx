import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isEnvironmentTelemetryRuntimeEnabled } from './environmentTelemetryFeatureFlags.js';
import EnvironmentRealtimeTelemetryHub from './EnvironmentRealtimeTelemetryHub.jsx';
import { EnvironmentTelemetryRealtimeWorkspace } from './EnvironmentTelemetryRealtimeWorkspace.jsx';
import { EnvironmentTelemetryAlertWorkspace } from './EnvironmentTelemetryAlertWorkspace.jsx';
import { EnvironmentEdgeTelemetryWorkspace } from './EnvironmentEdgeTelemetryWorkspace.jsx';

export function EnvironmentTelemetryViewRouter({ companyId }) {
  const [searchParams] = useSearchParams();
  const panel = searchParams.get('panel') || 'hub';

  if (!isEnvironmentTelemetryRuntimeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase' }}>
          Telemetry runtime desligado (shadow)
        </p>
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar
        </Link>
      </div>
    );
  }

  if (panel === 'realtime') return <EnvironmentTelemetryRealtimeWorkspace companyId={companyId} />;
  if (panel === 'alerts') return <EnvironmentTelemetryAlertWorkspace />;
  if (panel === 'edge') return <EnvironmentEdgeTelemetryWorkspace />;
  return <EnvironmentRealtimeTelemetryHub companyId={companyId} />;
}

export default EnvironmentTelemetryViewRouter;
