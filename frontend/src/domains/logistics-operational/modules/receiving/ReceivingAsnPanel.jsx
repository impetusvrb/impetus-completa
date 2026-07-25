import React, { useState } from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

/**
 * OPM-003 — Cadastro ASN (porta de entrada inbound).
 */
export default function ReceivingAsnPanel({ warehouses = [], docks = [], onSubmit, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    warehouseId: '',
    orderNumber: '',
    asnNumber: '',
    supplierRef: '',
    supplierName: '',
    poNumber: '',
    dockId: '',
    expectedAt: '',
    qtyExpected: ''
  });

  const whDocks = docks.filter((d) => !form.warehouseId || d.warehouse_id === form.warehouseId);

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!onSubmit || busy) return;
    setError(null);
    setBusy(true);
    try {
      await onSubmit(form);
      setForm({
        warehouseId: form.warehouseId,
        orderNumber: '',
        asnNumber: '',
        supplierRef: '',
        supplierName: '',
        poNumber: '',
        dockId: '',
        expectedAt: '',
        qtyExpected: ''
      });
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Erro ao registar ASN');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="receiving-asn-panel">
        <button
          type="button"
          className="btn btn-ghost"
          style={{ borderRadius: 4, fontSize: 11, borderColor: 'var(--cyan)' }}
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          + Registar ASN
        </button>
      </div>
    );
  }

  return (
    <section className="receiving-asn-panel receiving-asn-form impetus-card" style={{ padding: '1rem', borderRadius: 4, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ ...mono, color: 'var(--cyan)', margin: 0, fontSize: 11 }}>Novo ASN · inbound</h3>
        <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 10 }} onClick={() => setOpen(false)}>
          Fechar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="receiving-asn-fields">
        <label>
          <span>Armazém</span>
          <select value={form.warehouseId} required onChange={(e) => handleChange('warehouseId', e.target.value)} disabled={busy}>
            <option value="">Seleccionar…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.code || w.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Documento / ordem</span>
          <input value={form.orderNumber} required onChange={(e) => handleChange('orderNumber', e.target.value)} disabled={busy} placeholder="RCV-2026-001" />
        </label>
        <label>
          <span>ASN</span>
          <input value={form.asnNumber} required onChange={(e) => handleChange('asnNumber', e.target.value)} disabled={busy} placeholder="ASN-0001" />
        </label>
        <label>
          <span>Fornecedor (ref.)</span>
          <input value={form.supplierRef} onChange={(e) => handleChange('supplierRef', e.target.value)} disabled={busy} />
        </label>
        <label>
          <span>Fornecedor (nome)</span>
          <input value={form.supplierName} onChange={(e) => handleChange('supplierName', e.target.value)} disabled={busy} />
        </label>
        <label>
          <span>Pedido compra</span>
          <input value={form.poNumber} onChange={(e) => handleChange('poNumber', e.target.value)} disabled={busy} />
        </label>
        <label>
          <span>Doca</span>
          <select value={form.dockId} onChange={(e) => handleChange('dockId', e.target.value)} disabled={busy}>
            <option value="">Sem doca</option>
            {whDocks.map((d) => (
              <option key={d.id} value={d.id}>{d.location_code || d.code}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Previsão chegada</span>
          <input type="datetime-local" value={form.expectedAt} onChange={(e) => handleChange('expectedAt', e.target.value)} disabled={busy} />
        </label>
        <label>
          <span>Qtd. prevista</span>
          <input type="number" min="0" value={form.qtyExpected} onChange={(e) => handleChange('qtyExpected', e.target.value)} disabled={busy} />
        </label>

        {error && <p className="receiving-asn-error">{error}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="submit" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11, borderColor: 'var(--cyan)' }} disabled={busy}>
            {busy ? 'A registar…' : 'Registar ASN'}
          </button>
        </div>
      </form>
    </section>
  );
}
