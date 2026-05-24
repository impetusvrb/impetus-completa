import React from 'react';
import useCognitiveOsData from '../runtime/useCognitiveOsData';
import { shortenText } from '../runtime/cognitiveOsFormatters';
import '../styles/cognitiveOs.css';

export default function ZOperationalMemoryPanel({ payload }) {
  const data = useCognitiveOsData(payload);
  if (!data.available) return null;
  const mem = data.memory || {};
  const last5 = Array.isArray(mem.last_5) ? mem.last_5 : [];

  return (
    <section className="z-cog-panel" aria-label="Memória operacional">
      <header className="z-cog-panel__header">
        <h3 className="z-cog-panel__title">Memória Operacional · Z</h3>
        <span className="z-cog-panel__subtitle">{mem.total_entries || 0} entradas · tenant-isolated</span>
      </header>

      <div className="z-cog-panel__body">
        {last5.length === 0 ? (
          <div className="z-cog-empty">Memória vazia para este tenant</div>
        ) : (
          <ul className="z-cog-list">
            {last5.map((e) => (
              <li key={e.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span className="z-cog-badge">{e.type}</span>
                  <span className="z-cog-label">{new Date(e.ts).toLocaleTimeString()}</span>
                </div>
                <div style={{ marginTop: 4 }}>{shortenText(e.summary, 100)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
