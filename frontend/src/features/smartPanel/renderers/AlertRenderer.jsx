import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export default function AlertRenderer({ alerts = [], visualOnly = false }) {
  if (!alerts?.length) return null;
  return (
    <div className="smart-panel-visual__alerts">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`smart-panel-visual__alert smart-panel-visual__alert--${a.severity || 'info'}${
            visualOnly ? ' smart-panel-visual__alert--icon-only' : ''
          }`}
        >
          {a.severity === 'critical' ? <AlertTriangle size={18} aria-hidden /> : <Info size={18} aria-hidden />}
          {visualOnly ? (
            <span className="sr-only">
              {a.title}. {a.message}
            </span>
          ) : (
            <div>
              <strong>{a.title}</strong>
              <p>{a.message}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
