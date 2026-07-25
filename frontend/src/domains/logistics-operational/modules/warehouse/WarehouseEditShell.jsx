import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function WarehouseEditShell({ open, warehouse, onClose }) {
  if (!open) return null;
  return (
    <div className="warehouse-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="wh-edit-title">
      <div className="warehouse-modal impetus-card">
        <h2 id="wh-edit-title" style={{ margin: '0 0 8px', fontSize: 16, textTransform: 'uppercase' }}>
          Editar armazém
        </h2>
        <p style={{ ...mono, color: 'var(--amber)', fontSize: 11, margin: '0 0 12px' }}>
          Edição indisponível — GAP-OPM-WH-006 · API PATCH /warehouses/:id não certificada.
        </p>
        {warehouse && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
            {warehouse.code} · {warehouse.name}
          </p>
        )}
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, marginTop: 12 }}>
          Campos previstos: descrição, status, capacidade, atributos suportados — activáveis quando API existir.
        </p>
        <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, marginTop: 14 }} onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}
