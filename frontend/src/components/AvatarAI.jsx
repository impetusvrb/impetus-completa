import React from 'react';

export default function AvatarAI({ size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.4 }}>
      IA
    </div>
  );
}
