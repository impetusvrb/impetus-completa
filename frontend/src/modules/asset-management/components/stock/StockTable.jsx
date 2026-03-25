/**
 * IMPETUS - Gestão de Ativos - Tabela de peças com insights IA
 */
import React from 'react';
import { Package, Sparkles } from 'lucide-react';
import { calculateReorderPoint } from '../../utils/stockOptimizer';
import styles from '../../styles/AssetManagement.module.css';

function getStockStatus(item, opt) {
  const qty = item.qty ?? 0;
  const reorder = opt?.reorderPoint ?? item.reorderPoint ?? 0;
  if (qty <= 0) return { label: 'Ruptura', class: 'crit' };
  if (opt?.urgency === 'critical' || qty <= reorder) return { label: qty <= reorder ? 'Abaixo do ponto' : 'Risco IA', class: 'warn' };
  return { label: 'OK', class: 'ok' };
}

export default function StockTable({
  items = [],
  twins = [],
  onAdjustReorder,
  canAdjust,
  showAiColumn,
  onRequestPurchase
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Código</th>
            <th>Peça</th>
            <th>Qtd</th>
            <th>Ponto cadastrado</th>
            {showAiColumn && <th>Sugestão IA</th>}
            <th>Status</th>
            {canAdjust && <th>Ação</th>}
            {onRequestPurchase && <th>Pedido</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const opt = calculateReorderPoint(item, twins);
            const status = getStockStatus(item, opt);
            return (
              <tr key={item.id || item.code}>
                <td className={styles.tableCode}>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.qty ?? '—'}</td>
                <td>{item.reorderPoint ?? '—'}</td>
                {showAiColumn && (
                  <td>
                    <span title={opt.aiReason} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {opt.reorderPoint}
                      <Sparkles size={14} style={{ marginLeft: 6, verticalAlign: 'middle', opacity: 0.7 }} />
                    </span>
                  </td>
                )}
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
                {onRequestPurchase && (
                  <td>
                    <button type="button" className={styles.btnLink} onClick={() => onRequestPurchase(item)}>
                      Comprar
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
