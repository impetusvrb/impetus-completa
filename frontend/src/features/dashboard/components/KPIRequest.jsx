import React, { useState } from 'react';

export default function KPIRequest({ onSubmit, loading }) {
  const [value, setValue] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <input
        type="text"
        placeholder="Solicitar novo indicador..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={loading}
        style={{ flex: 1, padding: 8 }}
      />
      <button type="button" onClick={() => { onSubmit(value); setValue(''); }} disabled={loading || !value?.trim()}>
        {loading ? '...' : 'Solicitar'}
      </button>
    </div>
  );
}
