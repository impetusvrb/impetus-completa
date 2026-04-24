/**
 * Export genérico para Excel / PDF a partir do output do painel inteligente.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

async function loadExcelJS() {
  return await import('exceljs');
}

function flattenClaudePayloadForSheet(payload) {
  const rows = [];
  const push = (sec, a, b) => rows.push([sec, a, b != null ? String(b) : '']);
  const title = payload?.title || '';
  const desc = payload?.description || '';
  if (title) push('Meta', 'Título', title);
  if (desc) push('Meta', 'Descrição', desc);
  const type = String(payload?.type || 'chart').toLowerCase();
  const out = payload?.output || {};

  if (type === 'chart') {
    const labels = out.labels || [];
    const datasets = out.datasets || [];
    labels.forEach((lab, i) => {
      if (!datasets.length) {
        push('Gráfico', String(lab), '');
        return;
      }
      datasets.forEach((ds, j) => {
        const v = Array.isArray(ds?.data) ? ds.data[i] : '';
        push('Gráfico', `${String(lab)} — ${ds?.label || `Série ${j + 1}`}`, v);
      });
    });
  } else if (type === 'table') {
    const cols = out.columns || [];
    (out.rows || []).forEach((row, i) => {
      const line = cols.map((c, j) => `${c}: ${row[j] != null ? String(row[j]) : '—'}`).join('; ');
      push('Tabela', `Linha ${i + 1}`, line);
    });
  } else if (type === 'kpi') {
    (out.cards || []).forEach((c) => {
      const extra = c.trend ? ` (${c.trend})` : '';
      push('KPI', c.label, `${c.value != null ? String(c.value) : '—'}${extra}`);
    });
  } else if (type === 'report') {
    (out.sections || []).forEach((s) => push('Relatório', s.heading || '—', s.body || ''));
  } else if (type === 'alert') {
    (out.items || []).forEach((it) => push('Alerta', it.level || 'info', it.message || ''));
  }

  return { headers: ['Secção', 'Rótulo', 'Valor'], rows };
}

function legacyVisualToPlainText(v) {
  if (!v) return '';
  const lines = [];
  if (v.title) lines.push(String(v.title));
  if (v.subtitle) lines.push(String(v.subtitle));
  if (v.exportRows?.length && v.exportColumns?.length) {
    lines.push(v.exportColumns.join('\t'));
    v.exportRows.forEach((r) => lines.push((r || []).map((c) => String(c ?? '')).join('\t')));
  } else if (v.kind === 'table' && v.columns?.length && v.rows?.length) {
    lines.push(v.columns.join('\t'));
    v.rows.forEach((r) => lines.push((r || []).map((c) => String(c ?? '')).join('\t')));
  }
  (v.chartData || []).forEach((pt) => {
    lines.push(`${pt.name}: ${pt.valor}`);
  });
  return lines.join('\n');
}

export function claudePayloadToPlainText(payload) {
  if (!payload) return '';
  const lines = [];
  if (payload.title) lines.push(String(payload.title));
  if (payload.description) lines.push(String(payload.description));
  const type = String(payload?.type || 'chart').toLowerCase();
  const out = payload?.output || {};
  if (type === 'chart') {
    const labels = out.labels || [];
    const datasets = out.datasets || [];
    labels.forEach((lab, i) => {
      if (!datasets.length) lines.push(String(lab));
      else {
        datasets.forEach((ds, j) => {
          const v = Array.isArray(ds?.data) ? ds.data[i] : '';
          lines.push(`${lab} — ${ds?.label || `Série ${j + 1}`}: ${v}`);
        });
      }
    });
  } else if (type === 'table') {
    const cols = out.columns || [];
    lines.push(cols.join(' | '));
    (out.rows || []).forEach((row) => {
      lines.push(cols.map((_, j) => (row[j] != null ? String(row[j]) : '—')).join(' | '));
    });
  } else if (type === 'kpi') {
    (out.cards || []).forEach((c) => {
      lines.push(`${c.label}: ${c.value != null ? c.value : '—'}${c.trend ? ` (${c.trend})` : ''}`);
    });
  } else if (type === 'report') {
    (out.sections || []).forEach((s) => {
      if (s.heading) lines.push(`## ${s.heading}`);
      if (s.body) lines.push(String(s.body));
    });
  } else if (type === 'alert') {
    (out.items || []).forEach((it) => lines.push(`[${it.level || 'info'}] ${it.message || ''}`));
  }
  return lines.join('\n');
}

/** Texto plano para partilha / chat (com limite). */
export function panelOutputToPlainText(output, maxLen = 10000) {
  if (!output) return '';
  let text;
  if (output.schema === 'impetus_claude_v1' && output.claudePayload) {
    text = claudePayloadToPlainText(output.claudePayload);
  } else if (output.legacyVisual) {
    text = legacyVisualToPlainText(output.legacyVisual);
  } else {
    const { headers, rows } = flattenOutputForSheet(output);
    const lines = [];
    if (output.title) lines.push(String(output.title));
    if (output.reportContent) lines.push(String(output.reportContent));
    rows.forEach((r) => lines.push(r.join(' — ')));
    text = lines.join('\n');
    if (!text.trim() && headers.length) text = [headers.join(' — '), ...rows.map((r) => r.join(' — '))].join('\n');
  }
  const prefix = '📊 Painel Impetus\n\n';
  const cap = Math.max(500, maxLen - prefix.length - 2);
  if (text.length <= cap) return prefix + text;
  return `${prefix}${text.slice(0, cap)}\n…`;
}

function flattenOutputForSheet(output) {
  if (!output) return { headers: ['Campo', 'Valor'], rows: [] };

  if (output.legacyVisual) {
    const v = output.legacyVisual;
    if (v.exportRows?.length && v.exportColumns?.length) {
      return { headers: v.exportColumns, rows: v.exportRows };
    }
    if (v.kind === 'table' && v.columns?.length && v.rows?.length) {
      return { headers: v.columns, rows: v.rows };
    }
    const rows = [];
    const push = (sec, a, b) => rows.push([sec, a, b != null ? String(b) : '']);
    if (v.title) push('Meta', 'Título', v.title);
    if (v.subtitle) push('Meta', 'Subtítulo', v.subtitle);
    (v.chartData || []).forEach((pt) => push('Gráfico', pt.name, pt.valor));
    return { headers: ['Secção', 'Rótulo', 'Valor'], rows };
  }

  if (output.schema === 'impetus_claude_v1' && output.claudePayload) {
    return flattenClaudePayloadForSheet(output.claudePayload);
  }

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

export async function downloadPanelXlsx(output) {
  const { default: ExcelJS } = await loadExcelJS();
  const { headers, rows } = flattenOutputForSheet(output);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Painel');
  ws.addRow(headers);
  rows.forEach((r) => ws.addRow(r));
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `impetus-painel-${Date.now()}.xlsx`;
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
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
