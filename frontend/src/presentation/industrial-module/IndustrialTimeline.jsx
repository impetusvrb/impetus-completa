import React from 'react';
import { mono } from './industrialModuleTokens.js';

export default function IndustrialTimeline({ events = [], placeholder = true }) {
  return (
    <section className="industrial-timeline impetus-card" style={{ marginTop: 12, padding: '1rem', borderRadius: 4 }}>
      <h3 style={{ ...mono, color: 'var(--text-tertiary)', margin: '0 0 8px', fontSize: 11 }}>Timeline operacional</h3>
      {events.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
          {events.map((ev, i) => (
            <li key={ev.id || i} style={{ marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
              {ev.label || ev.message}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: 0 }}>
          {placeholder ? 'Slot timeline · eventos activáveis em OPM-001+' : 'Sem eventos'}
        </p>
      )}
    </section>
  );
}
