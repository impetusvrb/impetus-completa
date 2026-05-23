import React, { useState, useEffect } from 'react';
import { useCognitivePulseContext } from './CognitivePulseContext';

const FALLBACK = [
  { label: 'COGNITIVE', value: 'SYNC' },
  { label: 'CORE', value: 'ACTIVE' },
  { label: 'AWARENESS', value: 'ONLINE' }
];

export default function CognitiveLiveTicker() {
  const { pulse } = useCognitivePulseContext();
  const [idx, setIdx] = useState(0);
  const footerWhispers = pulse?.global_presence?.whispers_by_channel?.footer || [];
  const energy = pulse?.organizational_energy;

  const items = [
    { label: 'MORAL', value: energy ? `${energy.morale_pct}%` : '—', cls: 'val-green' },
    { label: 'ENERGIA OPS', value: energy ? `${energy.operational_energy_pct}%` : '—', cls: 'val-cyan' },
    { label: 'RITMO', value: energy?.operation_rhythm || '—', cls: '' },
    { label: 'SYNC', value: energy ? `${energy.sync_pct}%` : '—', cls: 'val-green' },
    { label: 'IA', value: footerWhispers[idx % Math.max(footerWhispers.length, 1)]?.text?.slice(0, 28) || 'monitorando…', cls: 'val-amber' }
  ];

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => i + 1), 4000);
    return () => clearInterval(t);
  }, []);

  const display = items.length ? items : FALLBACK.map((f) => ({ ...f, cls: 'val-green' }));

  return (
    <footer className="ticker ticker--cognitive">
      <div className="ticker-label">// COGNITIVE LIVE</div>
      <div className="ticker-items">
        {display.map((it) => (
          <div key={it.label} className="ticker-item">
            {it.label} <span className={it.cls || ''}>{it.value}</span>
          </div>
        ))}
      </div>
    </footer>
  );
}
