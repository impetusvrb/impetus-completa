/**
 * IMPETUS - ManuIA 3D Vision - Geração de relatório PDF no browser
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const MARGIN = 20;
const PAGE_W = 210;
const PAGE_H = 297;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export function generateReport(data) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = PAGE_W - 2 * MARGIN;

  // Página 1 - Cabeçalho
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ManuIA Copiloto 3D', MARGIN, 20);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.equipment || 'Equipamento', MARGIN, 28);
  doc.text(`Data: ${data.date || new Date().toLocaleDateString('pt-BR')}`, MARGIN, 34);

  const sevColors = { CRITICO: '#ef4444', ALERTA: '#f59e0b', NORMAL: '#22c55e' };
  const sev = data.severity || 'NORMAL';
  doc.setFillColor(...hexToRgb(sevColors[sev] || sevColors.NORMAL));
  doc.rect(MARGIN, 38, 25, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(sev, MARGIN + 2, 43.5);
  doc.setTextColor(0, 0, 0);

  let y = 52;
  doc.setFontSize(10);
  doc.text(`Fabricante: ${data.manufacturer || '—'}`, MARGIN, y);
  y += 6;
  doc.text(`Confiança IA: ${data.confidence ?? '—'}%`, MARGIN, y);
  y += 6;
  doc.text(`Técnico: ${data.technicianName || '—'}`, MARGIN, y);
  y += 6;
  if (data.osNumber) doc.text(`OS Nº: ${data.osNumber}`, MARGIN, (y += 6));

  y += 12;

  // Imagens lado a lado
  const imgW = (w - 8) / 2;
  const imgH = 55;
  if (data.capturedImageBase64) {
    try {
      doc.addImage(
        `data:image/jpeg;base64,${data.capturedImageBase64}`,
        'JPEG',
        MARGIN,
        y,
        imgW,
        imgH
      );
    } catch (e) {
      doc.text('[Erro ao carregar foto]', MARGIN, y + imgH / 2);
    }
  }
  if (data.modelScreenshotBase64) {
    try {
      doc.addImage(
        `data:image/png;base64,${data.modelScreenshotBase64}`,
        'PNG',
        MARGIN + imgW + 8,
        y,
        imgW,
        imgH
      );
    } catch (e) {
      doc.text('[Erro ao carregar 3D]', MARGIN + imgW + 8, y + imgH / 2);
    }
  }

  y += imgH + 12;

  // Tabela de peças
  const parts = data.parts || [];
  const faultSet = new Set((data.faultParts || []).map((f) => String(f).toLowerCase()));
  const partRows = parts.map((p) => {
    const name = p.name || p.code || '—';
    const code = p.code || '—';
    const isFault = faultSet.has(String(name).toLowerCase()) || faultSet.has(String(code).toLowerCase());
    return [code, name, isFault ? 'Crítico' : 'OK'];
  });

  if (partRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Código', 'Peça', 'Status']],
      body: partRows,
      theme: 'grid',
      headStyles: { fillColor: [22, 42, 58] },
      columnStyles: {
        2: { cellWidth: 25 }
      },
      didParseCell: (table) => {
        if (table.section === 'body' && table.column.index === 2) {
          const v = table.cell.raw;
          if (v === 'Crítico') table.cell.styles.textColor = [239, 68, 68];
          else if (v === 'OK') table.cell.styles.textColor = [34, 197, 94];
        }
      }
    });
    y = doc.lastAutoTable.finalY + 12;
  }

  // Página 2 - Guia de manutenção
  if (y > 240) {
    doc.addPage();
    y = MARGIN;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Guia de Manutenção', MARGIN, y);
  y += 10;

  const steps = data.steps || [];
  const stepRows = steps.map((s, i) => [i + 1, s.title || '—', s.desc || '—']);
  if (stepRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Passo', 'Descrição']],
      body: stepRows,
      theme: 'grid',
      headStyles: { fillColor: [22, 42, 58] },
      columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 45 }, 2: { cellWidth: 'auto' } }
    });
    y = doc.lastAutoTable.finalY + 12;
  }

  // Fontes
  const webSources = data.webSources || [];
  if (webSources.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Fontes consultadas', MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    webSources.slice(0, 5).forEach((s) => {
      doc.setFontSize(9);
      doc.text(`• ${s.title || s.url || '—'}`, MARGIN + 2, y);
      y += 5;
    });
    y += 8;
  }

  // Assinatura
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Assinatura do técnico', MARGIN, y);
  y += 8;
  if (data.signatureBase64) {
    try {
      doc.addImage(
        `data:image/png;base64,${data.signatureBase64}`,
        'PNG',
        MARGIN,
        y,
        80,
        30
      );
      y += 35;
    } catch (e) {
      doc.setDrawColor(180);
      doc.rect(MARGIN, y, 80, 25);
      y += 30;
    }
  } else {
    doc.setDrawColor(180);
    doc.rect(MARGIN, y, 80, 25);
    y += 30;
  }

  // Rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Gerado por ManuIA Copiloto 3D — ${new Date().toLocaleDateString('pt-BR')} — Página ${p}/${totalPages}`,
      MARGIN,
      PAGE_H - 10
    );
    doc.setTextColor(0, 0, 0);
  }

  return doc;
}
