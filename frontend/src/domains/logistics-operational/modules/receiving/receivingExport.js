import { RECEIVING_GRID_COLUMNS } from './receivingColumns.jsx';

const EXPORT_HEADERS = RECEIVING_GRID_COLUMNS.map((c) => c.key);

function csvCell(v) {
  const s = String(v ?? '');
  return s.includes(';') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToMatrix(rows) {
  const headerLabels = RECEIVING_GRID_COLUMNS.map((c) => c.label);
  const body = rows.map((r) => EXPORT_HEADERS.map((h) => r[h] ?? ''));
  return { headerLabels, body };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportReceivingCsv(rows, filename = 'recebimento.csv') {
  if (!rows?.length) return false;
  const { headerLabels, body } = rowsToMatrix(rows);
  const lines = [headerLabels.join(';'), ...body.map((line) => line.map(csvCell).join(';'))];
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
  return true;
}

export async function exportReceivingExcel(rows, filename = 'recebimento.xlsx') {
  if (!rows?.length) return false;
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Recebimento');
  const { headerLabels, body } = rowsToMatrix(rows);
  ws.addRow(headerLabels);
  body.forEach((line) => ws.addRow(line));
  ws.getRow(1).font = { bold: true };
  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
  return true;
}

export async function exportReceivingPdf(rows, filename = 'recebimento.pdf') {
  if (!rows?.length) return false;
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape' });
  const { headerLabels, body } = rowsToMatrix(rows);
  autoTable(doc, {
    head: [headerLabels],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 26, 40] }
  });
  doc.save(filename);
  return true;
}
