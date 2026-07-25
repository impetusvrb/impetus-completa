/**
 * OPM-002A — Exportação client-side CSV / Excel / PDF.
 */
import { INVENTORY_STOCK_COLUMNS } from './inventoryColumns.jsx';

const EXPORT_HEADERS = INVENTORY_STOCK_COLUMNS.map((c) => c.key);

function csvCell(v) {
  const s = String(v ?? '');
  return s.includes(';') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToMatrix(rows) {
  const headerLabels = INVENTORY_STOCK_COLUMNS.map((c) => c.label);
  const body = rows.map((r) => EXPORT_HEADERS.map((h) => r[h] ?? ''));
  return { headerLabels, body };
}

export function exportInventoryCsv(rows, filename = 'inventario.csv') {
  if (!rows?.length) return false;
  const { headerLabels, body } = rowsToMatrix(rows);
  const lines = [headerLabels.join(';'), ...body.map((line) => line.map(csvCell).join(';'))];
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
  return true;
}

export async function exportInventoryExcel(rows, filename = 'inventario.xlsx') {
  if (!rows?.length) return false;
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Inventário');
  const { headerLabels, body } = rowsToMatrix(rows);
  ws.addRow(headerLabels);
  body.forEach((line) => ws.addRow(line));
  ws.getRow(1).font = { bold: true };
  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
  return true;
}

export async function exportInventoryPdf(rows, filename = 'inventario.pdf') {
  if (!rows?.length) return false;
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape' });
  const { headerLabels, body } = rowsToMatrix(rows);
  doc.setFontSize(12);
  doc.text('IMPETUS — Inventário operacional', 14, 14);
  autoTable(doc, {
    head: [headerLabels],
    body: body.slice(0, 200),
    startY: 20,
    styles: { fontSize: 8 }
  });
  doc.save(filename);
  return true;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
