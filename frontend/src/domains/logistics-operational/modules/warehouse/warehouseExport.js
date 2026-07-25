/**
 * OPM-001B — Exportação CSV client-side (sem API export).
 */
export function exportWarehousesCsv(rows, filename = 'armazens.csv') {
  if (!rows?.length) return false;
  const headers = ['code', 'name', 'warehouse_type', 'status', 'id'];
  const lines = [headers.join(';')];
  for (const r of rows) {
    lines.push(headers.map((h) => csvCell(r[h])).join(';'));
  }
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

function csvCell(v) {
  const s = String(v ?? '');
  return s.includes(';') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}
