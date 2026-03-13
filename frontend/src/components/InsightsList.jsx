import React from 'react';

export default function InsightsList({ insights = [], onInsightClick }) {
  if (!insights?.length) return <p style={{ padding: 16, color: '#64748b' }}>Nenhum insight disponível.</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {insights.slice(0, 5).map((i, idx) => (
        <li key={i.id || idx} onClick={onInsightClick} style={{ padding: 12, cursor: 'pointer', borderBottom: '1px solid #e5e7eb' }}>
          {i.title || i.text || '-'}
        </li>
      ))}
    </ul>
  );
}
