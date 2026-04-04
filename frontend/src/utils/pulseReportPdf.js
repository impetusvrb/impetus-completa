import { jsPDF } from 'jspdf';

/**
 * Exporta o diagnóstico IA (JSON estruturado) para PDF legível.
 */
export function downloadPulseDiagnosticPdf(report, meta = {}) {
  const doc = new jsPDF();
  let y = 18;
  doc.setFontSize(15);
  doc.text('Impetus Pulse — Diagnóstico IA', 14, y);
  y += 9;
  doc.setFontSize(10);
  if (meta.period) {
    doc.text(`Período de referência: ${meta.period}`, 14, y);
    y += 6;
  }
  if (meta.collaborator) {
    doc.text(`Colaborador: ${meta.collaborator}`, 14, y);
    y += 8;
  }

  const ensureSpace = (linesNeeded) => {
    if (y + linesNeeded * 5 > 285) {
      doc.addPage();
      y = 18;
    }
  };

  const addBlock = (title, body) => {
    ensureSpace(8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(title), 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const text = body == null || body === '' ? '—' : String(body);
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 14, y);
    y += Math.max(lines.length * 5, 6) + 6;
  };

  if (!report || typeof report !== 'object') {
    addBlock('Conteúdo', JSON.stringify(report));
    doc.save(meta.filename || 'pulse_diagnostico.pdf');
    return;
  }

  addBlock('Resumo executivo', report.executive_summary);

  if (Array.isArray(report.alignment_matrix) && report.alignment_matrix.length) {
    report.alignment_matrix.forEach((row) => {
      const t = `${row.dimension || 'Dimensão'} — ${row.status || ''}`;
      addBlock(t, row.note || '');
    });
  }

  if (Array.isArray(report.pdi_suggestions) && report.pdi_suggestions.length) {
    report.pdi_suggestions.forEach((s, idx) => {
      addBlock(`Sugestão de PDI ${idx + 1}`, [s.action, s.rationale].filter(Boolean).join('\n'));
    });
  }

  addBlock('Destaque de talento', report.talent_highlight);

  doc.save(meta.filename || 'pulse_diagnostico.pdf');
}
