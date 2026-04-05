import React from 'react';
import TableRenderer from './TableRenderer';

export default function ComparisonRenderer({ comparison, hideTableTitle = false }) {
  if (!comparison?.rows?.length) return null;
  return (
    <TableRenderer
      title={hideTableTitle ? null : 'Comparativo'}
      columns={comparison.columns || ['A', 'B']}
      rows={comparison.rows}
    />
  );
}
