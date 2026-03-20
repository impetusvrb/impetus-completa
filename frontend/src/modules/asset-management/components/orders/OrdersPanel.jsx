import React from 'react';

export default function OrdersPanel({ orders = [] }) {
  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 8 }}>Ordens de serviço</h3>
      {orders.length === 0 ? (
        <p style={{ opacity: 0.8 }}>Sem ordens abertas.</p>
      ) : (
        <ul>
          {orders.slice(0, 10).map((o) => (
            <li key={o.id}>
              {o.id} - {o.machineName || 'Equipamento'} - {o.priority || 'P3'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

