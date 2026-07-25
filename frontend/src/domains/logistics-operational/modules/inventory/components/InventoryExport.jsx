import React from 'react';
import { EoxActionBar } from '../../../../../presentation/eox/index.js';

/**
 * OPM-002A Reference Module — exportação via ActionBar EOX (ARC-003).
 * CSV · Excel · PDF + acções standard (Atualizar · Ajuda).
 */
export default function InventoryExport({ onAction, disabled = false, exportEnabled = true }) {
  return (
    <EoxActionBar
      disabled={disabled}
      actions={[
        { id: 'refresh', enabled: true },
        { id: 'export', hidden: true },
        { id: 'export_csv', label: 'CSV', order: 21, enabled: exportEnabled },
        { id: 'export_excel', label: 'Excel', order: 22, enabled: exportEnabled },
        { id: 'export_pdf', label: 'PDF', order: 23, enabled: exportEnabled },
        { id: 'help', enabled: true }
      ]}
      onAction={onAction}
    />
  );
}
