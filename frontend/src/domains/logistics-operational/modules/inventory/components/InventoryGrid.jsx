import React from 'react';
import IndustrialDataGrid from '../../../../../presentation/industrial-module/IndustrialDataGrid.jsx';
import { INVENTORY_STOCK_COLUMNS } from '../inventoryColumns.jsx';
import { trackInventoryGridSort } from '../inventoryObservability.js';

/**
 * OPM-002A Reference Module — grid operacional com paginação, ordenação e seleção.
 */
export default function InventoryGrid({
  rows = [],
  columns = INVENTORY_STOCK_COLUMNS,
  pageSize = 25,
  onRowSelect,
  selectedRowId = null,
  enableSortTracking = true,
  onSortTrack = null
}) {
  const handleSort = onSortTrack
    ? ({ key, direction }) => onSortTrack(key, direction)
    : enableSortTracking
      ? ({ key, direction }) => trackInventoryGridSort(key, direction)
      : undefined;

  return (
    <IndustrialDataGrid
      rows={rows}
      columns={columns}
      pageSize={pageSize}
      onRowSelect={onRowSelect}
      selectedRowId={selectedRowId}
      onSortChange={handleSort}
    />
  );
}
