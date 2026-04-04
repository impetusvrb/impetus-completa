import React from 'react';
import TableRenderer from './TableRenderer';

export default function ComparisonRenderer({ comparison }) {
  if (!comparison?.rows?.length) return null;
  return (
    <TableRenderer
      title="Comparativo"
      columns={comparison.columns || ['A', 'B']}
      rows={comparison.rows}
    />
  );
}
