/**
 * Export genérico para Excel / PDF a partir do output do painel inteligente.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

function flattenOutputForSheet(output) {
  if (!output) return { headers: ['Campo', 'Valor'], rows: [] };
  const rows = [];
  const push = (sec, a, b) => rows.push([sec, a, b != null ? String(b) : '']);

  if (output.title) push('Meta', 'Título', output.title);
  if (output.permissionGranted === false && output.denialReason) {
    push('Acesso', 'Motivo', output.denialReason);
  }

  (output.chartData || output.barData || []).forEach((pt) => {
    push('Gráfico', pt.name, pt.valor);
  });
  (output.trendData || []).forEach((pt) => {
    push('Tendência', pt.name, pt.valor);
  });
  (output.kpiCards || []).forEach((c) => {
    push('KPI', c.title, c.value);
  });
  const tbl = output.table;
  if (tbl?.rows?.length) {
    tbl.rows.forEach((row) => push(tbl.title || 'Tabela', row[0], row.slice(1).join(' | ')));
  }
  (output.extraTables || []).forEach((tb) => {
    (tb.rows || []).forEach((row) => push(tb.title || 'Extra', row[0], row.slice(1).join(' | ')));
  });
  if (output.comparison?.rows?.length) {
    output.comparison.rows.forEach((row) => push('Comparativo', row[0], row[1]));
  }
  if (output.reportContent) {
    push('Relatório', output.reportContent.slice(0, 2000), '');
  }
  return { headers: ['Secção', 'Rótulo', 'Valor'], rows };
}

export function downloadPanelXlsx(output) {
  const { headers, rows } = flattenOutputForSheet(output);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Painel');
  XLSX.writeFile(wb, `impetus-painel-${Date.now()}.xlsx`);
}

export function downloadPanelPdf(output) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const title = output?.title || 'Impetus — Painel';
  doc.setFontSize(14);
  doc.text(title, 40, 48);
  if (output?.denialReason) {
    doc.setFontSize(10);
    doc.setTextColor(180, 80, 80);
    doc.text(String(output.denialReason).slice(0, 800), 40, 72, { maxWidth: 520 });
    doc.setTextColor(0);
  }
  const { headers, rows } = flattenOutputForSheet(output);
  autoTable(doc, { startY: 88, head: [headers], body: rows });
  doc.save(`impetus-painel-${Date.now()}.pdf`);
}

export function printPanel() {
  window.print();
}
