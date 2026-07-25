/** OPM-008 — Export cognitivo. */
import { trackClExport } from './clObservability.js';

function rowsToCsv(rows) {
  const headers = ['id', 'priority', 'type', 'title', 'confidence', 'impact', 'modules', 'trace_source'];
  const lines = [headers.join(';')];
  for (const r of rows) {
    lines.push(headers.map((h) => String(r[h] ?? '').replace(/;/g, ',')).join(';'));
  }
  return lines.join('\n');
}

export function exportClCsv(rows) {
  const blob = new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cognitive-logistics-opm008-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  trackClExport('csv', rows.length);
}

export async function exportClExcel(rows) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Cognitive OPM-008');
  ws.addRow(['id', 'priority', 'type', 'title', 'confidence', 'impact', 'modules', 'trace_source']);
  for (const r of rows) ws.addRow([r.id, r.priority, r.type, r.title, r.confidence, r.impact, r.modules, r.trace_source]);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cognitive-logistics-opm008-${Date.now()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  trackClExport('excel', rows.length);
}

export async function exportClPdf(rows, title = 'Cognitive Logistics · OPM-008') {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text(title, 14, 16);
  doc.setFontSize(8);
  let y = 24;
  for (const r of rows.slice(0, 40)) {
    doc.text(`${r.priority} · ${r.title} · conf ${r.confidence}`, 14, y);
    y += 5;
    if (y > 280) break;
  }
  doc.save(`cognitive-logistics-opm008-${Date.now()}.pdf`);
  trackClExport('pdf', rows.length);
}
