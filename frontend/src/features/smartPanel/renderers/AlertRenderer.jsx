import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export default function AlertRenderer({ alerts = [] }) {
  if (!alerts?.length) return null;
  return (
    <div className="smart-panel-visual__alerts">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`smart-panel-visual__alert smart-panel-visual__alert--${a.severity || 'info'}`}
        >
          {a.severity === 'critical' ? <AlertTriangle size={18} /> : <Info size={18} />}
          <div>
            <strong>{a.title}</strong>
            <p>{a.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
