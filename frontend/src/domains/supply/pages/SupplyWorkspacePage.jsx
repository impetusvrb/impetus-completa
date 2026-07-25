import React, { useEffect, useState } from 'react';
import SupplyFoundationShell from '../components/SupplyFoundationShell.jsx';
import { useSupplyFeatureFlags } from '../hooks/useSupplyFeatureFlags.js';
import { SUPPLY_COMMAND_CENTER } from '../routes/supplyWorkspaceRegistry.js';
import supplyApi from '../services/supplyApi.js';

const MODULES = [
  'suppliers',
  'purchase-requests',
  'purchase-orders',
  'quotations',
  'contracts',
  'approvals',
  'spend-centers',
  'categories'
];

export default function SupplyWorkspacePage() {
  const flags = useSupplyFeatureFlags();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    if (!flags.supply_enabled || !flags.supply_workspace_enabled) return;
    supplyApi.health().then(setHealth).catch(() => setHealth(null));
  }, [flags.supply_enabled, flags.supply_workspace_enabled]);

  return (
    <SupplyFoundationShell title="Supply / Suprimentos">
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
          Workspace homologação — REST APIs v1 · Pilot Integration Layer · sem fluxos operacionais WMS.
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
          CC: {SUPPLY_COMMAND_CENTER.runtime_id} · {SUPPLY_COMMAND_CENTER.payload_key}
        </p>
        {flags.supply_enabled && flags.supply_workspace_enabled && health && (
          <pre style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 12, overflow: 'auto' }}>
            {JSON.stringify(health, null, 2)}
          </pre>
        )}
        <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)' }}>
          {MODULES.map((m) => (
            <li key={m}>{m} — REST v1 registered</li>
          ))}
        </ul>
      </div>
    </SupplyFoundationShell>
  );
}
