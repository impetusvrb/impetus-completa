import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

const TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'cold', label: 'Frio' },
  { value: 'hazmat', label: 'HAZMAT' },
  { value: 'quarantine', label: 'Quarentena' },
  { value: 'virtual', label: 'Virtual' }
];

export default function WarehouseCreateModal({ open, form, submitting, feedback, onClose, onChange, onSubmit }) {
  if (!open) return null;

  return (
    <div className="warehouse-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="wh-create-title">
      <div className="warehouse-modal impetus-card">
        <header style={{ marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
          <h2 id="wh-create-title" style={{ margin: 0, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Novo armazém
          </h2>
          <p style={{ ...mono, color: 'var(--text-tertiary)', margin: '4px 0 0', fontSize: 10 }}>POST /warehouses · WMS-003 v1</p>
        </header>

        <div className="warehouse-form-grid">
          <label>
            <span style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)' }}>Código *</span>
            <input
              className="warehouse-form-input"
              value={form.code}
              onChange={(e) => onChange('code', e.target.value)}
              maxLength={32}
              disabled={submitting}
              aria-required="true"
            />
          </label>
          <label>
            <span style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)' }}>Nome *</span>
            <input
              className="warehouse-form-input"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              maxLength={128}
              disabled={submitting}
              aria-required="true"
            />
          </label>
          <label>
            <span style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)' }}>Tipo</span>
            <select
              className="warehouse-form-input"
              value={form.warehouse_type}
              onChange={(e) => onChange('warehouse_type', e.target.value)}
              disabled={submitting}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)' }}>Capacidade (unidades)</span>
            <input
              className="warehouse-form-input"
              type="number"
              min="0"
              value={form.metadata?.capacity_units ?? ''}
              onChange={(e) => onChange('capacity_units', e.target.value)}
              disabled={submitting}
            />
          </label>
        </div>

        {feedback && (
          <p
            style={{
              ...mono,
              fontSize: 11,
              marginTop: 10,
              color: feedback.type === 'error' ? 'var(--red)' : feedback.type === 'success' ? 'var(--green)' : 'var(--amber)'
            }}
          >
            {feedback.message}
          </p>
        )}

        <footer style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" style={{ borderRadius: 4 }} onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, borderColor: 'var(--cyan)' }} onClick={onSubmit} disabled={submitting}>
            {submitting ? 'A registar…' : 'Registar armazém'}
          </button>
        </footer>
      </div>
    </div>
  );
}
