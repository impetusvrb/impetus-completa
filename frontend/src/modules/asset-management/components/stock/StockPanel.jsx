import React, { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import StockTable from './StockTable';
import { can } from '../../utils/permissions';
import { calculateReorderPoint } from '../../utils/stockOptimizer';
import styles from '../../styles/AssetManagement.module.css';

export default function StockPanel({ stock = [], twins = [], profile, onCreatePurchaseOrder, onAdjustReorder }) {
  const [poItem, setPoItem] = useState(null);
  const [poQty, setPoQty] = useState(1);
  const [poNote, setPoNote] = useState('');

  const canPurchase = can(profile, 'stockPurchaseOrder');
  const canAdjust = can(profile, 'stockAdjustReorder');

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Estoque de peças</h3>
      </div>
      <StockTable
        items={stock}
        twins={twins}
        canAdjust={canAdjust}
        onAdjustReorder={(item) => onAdjustReorder?.(item)}
        showAiColumn
        onRequestPurchase={canPurchase ? (item) => {
          const opt = calculateReorderPoint(item, twins);
          setPoItem(item);
          setPoQty(Math.max(1, opt.suggestedOrderQty || 1));
          setPoNote(opt.aiReason);
        } : undefined}
      />

      {poItem && canPurchase && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>
                <ShoppingCart size={20} /> Pedido de compra
              </h2>
              <button type="button" className={styles.modalClose} onClick={() => setPoItem(null)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalHint}>
                <strong>{poItem.code}</strong> — {poItem.name}
              </p>
              <div className={styles.formGroup}>
                <label>Quantidade sugerida</label>
                <input
                  type="number"
                  min={1}
                  className={styles.modalInput}
                  value={poQty}
                  onChange={(e) => setPoQty(Number(e.target.value) || 1)}
                />
              </div>
              <div className={styles.poObs}>
                <label>Motivo / observação</label>
                <textarea className={styles.modalTextarea} value={poNote} onChange={(e) => setPoNote(e.target.value)} rows={3} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setPoItem(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={async () => {
                  await onCreatePurchaseOrder?.({
                    itemId: poItem.id,
                    code: poItem.code,
                    qty: poQty,
                    note: poNote
                  });
                  setPoItem(null);
                }}
              >
                Enviar pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
