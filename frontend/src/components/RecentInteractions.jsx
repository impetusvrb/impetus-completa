import React from 'react';

export default function RecentInteractions({ interactions = [], onInteractionClick }) {
  if (!interactions?.length) return <p style={{ padding: 16, color: '#64748b' }}>Nenhuma interação recente.</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {interactions.slice(0, 5).map((i, idx) => (
        <li key={i.id || idx} onClick={onInteractionClick} style={{ padding: 12, cursor: 'pointer', borderBottom: '1px solid #e5e7eb' }}>
          {i.type || i.description || '-'}
        </li>
      ))}
    </ul>
  );
}
