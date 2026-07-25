import React from 'react';

/**
 * OPM-002A Reference Module — filtros de status operacionais.
 */
export default function InventoryFilters({ filters = [], onFilterChange, disabled = false }) {
  if (!filters.length) return null;

  return (
    <div className="inventory-module-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {filters.map((f) => (
        <button
          key={f.id}
          type="button"
          className={`btn btn-ghost ${f.active ? 'inventory-filter-active' : ''}`}
          style={{ borderRadius: 4, fontSize: 11 }}
          disabled={disabled}
          onClick={() => onFilterChange?.(f.id)}
          aria-pressed={f.active}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
