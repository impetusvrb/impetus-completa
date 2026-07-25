import React from 'react';
import { INVENTORY_TIMELINE_PERIODS } from '../inventoryListUtils.js';
import { trackInventoryTimeline, trackInventoryViewChanged } from '../inventoryObservability.js';

/**
 * OPM-002A Reference Module — filtros de timeline operacional.
 * Período · utilizador · armazém · produto.
 */
export default function InventoryTimeline({
  periodDays,
  onPeriodChange,
  userFilter = '',
  onUserFilterChange,
  warehouseFilter = '',
  onWarehouseFilterChange,
  productFilter = '',
  onProductFilterChange,
  warehouses = [],
  products = [],
  labels = {},
  onPeriodTrack = null
}) {
  const L = {
    section: labels.section || 'Timeline · filtros',
    period: labels.period || 'Período',
    user: labels.user || 'Utilizador',
    warehouse: labels.warehouse || 'Armazém',
    product: labels.product || 'Produto',
    userPlaceholder: labels.userPlaceholder || 'Operador…'
  };
  const handlePeriod = (days, id) => {
    onPeriodChange?.(days);
    if (onPeriodTrack) onPeriodTrack(days, id);
    else {
      trackInventoryTimeline(days);
      trackInventoryViewChanged(`timeline_${id}`);
    }
  };

  return (
    <div className="inventory-timeline-filters">
      <span className="inventory-timeline-label">{L.section}</span>

      <span className="inventory-timeline-group-label">{L.period}</span>
      {INVENTORY_TIMELINE_PERIODS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`btn btn-ghost ${periodDays === p.days ? 'inventory-filter-active' : ''}`}
          style={{ borderRadius: 4, fontSize: 10 }}
          onClick={() => handlePeriod(p.days, p.id)}
        >
          {p.label}
        </button>
      ))}

      <span className="inventory-timeline-group-label">{L.user}</span>
      <input
        type="text"
        className="inventory-timeline-input"
        value={userFilter}
        onChange={(e) => onUserFilterChange?.(e.target.value)}
        placeholder={L.userPlaceholder}
        aria-label={`Filtrar timeline por ${L.user.toLowerCase()}`}
      />

      <span className="inventory-timeline-group-label">{L.warehouse}</span>
      <select
        className="inventory-timeline-select"
        value={warehouseFilter}
        onChange={(e) => onWarehouseFilterChange?.(e.target.value)}
        aria-label={`Filtrar timeline por ${L.warehouse.toLowerCase()}`}
      >
        <option value="">Todos</option>
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.code || w.name || w.id}
          </option>
        ))}
      </select>

      <span className="inventory-timeline-group-label">{L.product}</span>
      <select
        className="inventory-timeline-select"
        value={productFilter}
        onChange={(e) => onProductFilterChange?.(e.target.value)}
        aria-label={`Filtrar timeline por ${L.product.toLowerCase()}`}
      >
        <option value="">Todos</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
