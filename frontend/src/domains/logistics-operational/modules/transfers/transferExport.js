import { trackTransferExport } from './transferObservability.js';

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTransferCsv(rows) {
  const headers = ['order_number', 'internal_type_label', 'from_warehouse', 'to_warehouse', 'operational_status_label', 'qty_total', 'operator'];
  const lines = [headers.join(';')];
  for (const r of rows) {
    lines.push(headers.map((h) => String(r[h] ?? '').replace(/;/g, ',')).join(';'));
  }
  downloadBlob(`transferencias-opm006-${Date.now()}.csv`, new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
  trackTransferExport('csv', rows.length);
}

export async function exportTransferExcel(rows) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Transferências OPM-006');
  ws.columns = [
    { header: 'Ordem', key: 'order_number', width: 16 },
    { header: 'Tipo', key: 'internal_type_label', width: 14 },
    { header: 'Origem', key: 'from_warehouse', width: 12 },
    { header: 'Destino', key: 'to_warehouse', width: 12 },
    { header: 'Status', key: 'operational_status_label', width: 14 },
    { header: 'Qtd', key: 'qty_total', width: 8 },
    { header: 'Operador', key: 'operator', width: 14 }
  ];
  ws.addRows(rows);
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(`transferencias-opm006-${Date.now()}.xlsx`, new Blob([buf]));
  trackTransferExport('excel', rows.length);
}

export async function exportTransferPdf(rows, title = 'Transferências · OPM-006') {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(10);
  doc.text(title, 14, 14);
  let y = 22;
  for (const r of rows.slice(0, 40)) {
    doc.text(
      `${r.order_number} · ${r.internal_type_label} · ${r.from_warehouse}→${r.to_warehouse} · ${r.operational_status_label}`,
      14,
      y
    );
    y += 6;
    if (y > 190) break;
  }
  doc.save(`transferencias-opm006-${Date.now()}.pdf`);
  trackTransferExport('pdf', rows.length);
}
