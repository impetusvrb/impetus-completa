/**
 * IMPETUS - Gestão de Ativos - Tabela de peças com insights IA
 */
import React from 'react';
import { Package } from 'lucide-react';
import styles from '../../styles/AssetManagement.module.css';

function getStockStatus(item) {
  const qty = item.qty ?? 0;
  const reorder = item.reorderPoint ?? 0;
  if (qty <= 0) return { label: 'Ruptura', class: 'crit' };
  if (qty <= reorder) return { label: 'Abaixo do ponto', class: 'warn' };
  return { label: 'OK', class: 'ok' };
}

export default function StockTable({ items = [], onAdjustReorder, canAdjust }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Código</th>
            <th>Peça</th>
            <th>Qtd</th>
            <th>Ponto pedido</th>
            <th>Status</th>
            {canAdjust && <th>Ação</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = getStockStatus(item);
            return (
              <tr key={item.id || item.code}>
                <td className={styles.tableCode}>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.qty ?? '—'}</td>
                <td>{item.reorderPoint ?? '—'}</td>
                <td>
                  <span className={`${styles.stockBadge} ${styles[`stockBadge--${status.class}`]}`}>
                    {status.label}
                  </span>
                </td>
                {canAdjust && (
                  <td>
                    <button
                      type="button"
                      className={styles.btnLink}
                      onClick={() => onAdjustReorder?.(item)}
                    >
                      Ajustar
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {items.length === 0 && (
        <p className={styles.panelEmpty}>
          <Package size={24} /> Nenhum item em estoque.
        </p>
      )}
    </div>
  );
}
