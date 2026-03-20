import React from 'react';

export default function TwinsPanel({ twins = [] }) {
  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 8 }}>Gêmeos digitais</h3>
      {twins.length === 0 ? (
        <p style={{ opacity: 0.8 }}>Sem dados no momento.</p>
      ) : (
        <ul>
          {twins.slice(0, 8).map((t) => (
            <li key={t.id || t.machineId}>
              {t.name || t.machineId} - {t.status || 'ok'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

