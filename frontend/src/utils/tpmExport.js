/**
 * Exportacao TPM — CSV (incidentes e totais por turno) e Excel (.xlsx) com duas folhas.
 * O pacote `xlsx` é carregado sob demanda ao gerar Excel (menor bundle inicial).
 */

export function shiftNumberLabel(n) {
  const x = parseInt(n, 10);
  if (x === 1) return '1 — Manhã';
  if (x === 2) return '2 — Tarde';
  if (x === 3) return '3 — Noite';
  return n != null ? String(n) : '—';
}

function escapeCsvCell(v) {
  if (v == null || v === '') return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildTpmIncidentsCsv(rows) {
  const headers = [
    'id',
    'data',
    'hora',
    'equipamento',
    'componente',
    'perdas_antes',
    'perdas_durante',
    'perdas_depois',
    'operador',
    'mecanico',
    'causa_raiz',
    'acao_corretiva',
    'lote',
    'fornecedor',
    'material',
    'descricao_produto'
  ];
  const lines = [headers.join(';')];
  for (const row of rows || []) {
    lines.push(
      [
        escapeCsvCell(row.id),
        escapeCsvCell(row.incident_date),
        escapeCsvCell(row.incident_time),
        escapeCsvCell(row.equipment_code),
        escapeCsvCell(row.component_name),
        escapeCsvCell(row.losses_before),
        escapeCsvCell(row.losses_during),
        escapeCsvCell(row.losses_after),
        escapeCsvCell(row.operator_name),
        escapeCsvCell(row.maintainer_name),
        escapeCsvCell(row.root_cause),
        escapeCsvCell(row.corrective_action),
        escapeCsvCell(row.lot_code),
        escapeCsvCell(row.supplier_name),
        escapeCsvCell(row.material_name),
        escapeCsvCell(row.product_description)
      ].join(';')
    );
  }
  return lines.join('\r\n');
}

export function buildShiftTotalsCsv(rows) {
  const headers = ['data', 'turno', 'perdas_acumuladas', 'incidentes'];
  const lines = [headers.join(';')];
  for (const row of rows || []) {
    lines.push(
      [
        escapeCsvCell(row.shift_date),
        escapeCsvCell(shiftNumberLabel(row.shift_number)),
        escapeCsvCell(row.total_losses),
        escapeCsvCell(row.incident_count)
      ].join(';')
    );
  }
  return lines.join('\r\n');
}

export function downloadCsv(filename, content) {
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
}

function stampPrefix(name) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `${name}_${stamp}.csv`;
}

export function downloadTpmIncidentsCsv(incidents) {
  downloadCsv(stampPrefix('tpm_incidentes'), buildTpmIncidentsCsv(incidents));
}

export function downloadShiftTotalsCsv(shiftTotals) {
  downloadCsv(stampPrefix('tpm_totais_turno'), buildShiftTotalsCsv(shiftTotals));
}

export async function downloadTpmExcelWorkbook(incidents, shiftTotals) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const incRows = (incidents || []).map((r) => ({
    ID: r.id,
    Data: r.incident_date,
    Hora: r.incident_time,
    Equipamento: r.equipment_code,
    Componente: r.component_name,
    'Perdas antes': r.losses_before,
    'Perdas durante': r.losses_during,
    'Perdas depois': r.losses_after,
    Operador: r.operator_name,
    'Mecânico': r.maintainer_name,
    'Causa raiz': r.root_cause,
    'Ação corretiva': r.corrective_action,
    Lote: r.lot_code,
    Fornecedor: r.supplier_name,
    Material: r.material_name,
    'Descrição do produto': r.product_description
  }));

  const ws1 = XLSX.utils.json_to_sheet(
    incRows.length ? incRows : [{ Mensagem: 'Sem incidentes no período selecionado.' }]
  );
  XLSX.utils.book_append_sheet(wb, ws1, 'Incidentes');

  const totRows = (shiftTotals || []).map((r) => ({
    Data: r.shift_date,
    Turno: shiftNumberLabel(r.shift_number),
    'Perdas acumuladas': r.total_losses,
    Incidentes: r.incident_count
  }));

  const ws2 = XLSX.utils.json_to_sheet(
    totRows.length ? totRows : [{ Mensagem: 'Sem totais agregados no período selecionado.' }]
  );
  XLSX.utils.book_append_sheet(wb, ws2, 'Totais por turno');

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  XLSX.writeFile(wb, `tpm_export_${stamp}.xlsx`);
}
