import React from 'react';
import StockTable from './StockTable';

export default function StockPanel({ stock = [] }) {
  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 8 }}>Estoque</h3>
      <StockTable items={stock} />
    </section>
  );
}

