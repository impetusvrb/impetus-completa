import { trackWiExport } from './wiObservability.js';

const EXPORT_HEADERS = ['priority', 'type', 'title', 'message', 'trace_source'];

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportWiCsv(rows) {
  const lines = [EXPORT_HEADERS.join(';')];
  for (const r of rows) {
    lines.push(EXPORT_HEADERS.map((h) => String(r[h] ?? '').replace(/;/g, ',')).join(';'));
  }
  downloadBlob(`warehouse-intelligence-opm007-${Date.now()}.csv`, new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
  trackWiExport('csv', rows.length);
}

export async function exportWiExcel(rows) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('WI OPM-007');
  ws.columns = EXPORT_HEADERS.map((h) => ({ header: h, key: h, width: 20 }));
  ws.addRows(rows);
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(`warehouse-intelligence-opm007-${Date.now()}.xlsx`, new Blob([buf]));
  trackWiExport('excel', rows.length);
}

export async function exportWiPdf(rows, title = 'Warehouse Intelligence · OPM-007') {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(10);
  doc.text(title, 14, 14);
  let y = 22;
  for (const r of rows.slice(0, 40)) {
    doc.text(`${r.priority} · ${r.title} · ${r.trace_source}`, 14, y);
    y += 6;
    if (y > 190) break;
  }
  doc.save(`warehouse-intelligence-opm007-${Date.now()}.pdf`);
  trackWiExport('pdf', rows.length);
}
