/**
 * Renderiza gráficos/tabelas no painel da IA por voz + exportar PDF / Excel / imprimir.
 */
import React, { useRef, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { Download, FileSpreadsheet, Printer, Share2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function VoicePanelVisualRenderer({ visual, className = '', visualOnly = false }) {
  const printRef = useRef(null);

  const downloadXlsx = useCallback(() => {
    if (!visual) return;
    const rows = visual.exportRows;
    const cols = visual.exportColumns;
    if (rows && cols) {
      const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Impetus');
      XLSX.writeFile(wb, `impetus-voz-${Date.now()}.xlsx`);
      return;
    }
    if (visual.kind === 'table' && visual.columns && visual.rows) {
      const ws = XLSX.utils.aoa_to_sheet([visual.columns, ...visual.rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dados');
      XLSX.writeFile(wb, `impetus-voz-${Date.now()}.xlsx`);
    }
  }, [visual]);

  const downloadPdf = useCallback(() => {
    if (!visual) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const title = visual.title || 'Impetus';
    doc.setFontSize(14);
    doc.text(title, 40, 48);
    if (visual.subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(visual.subtitle, 40, 64);
      doc.setTextColor(0);
    }
    let startY = 88;
    if (visual.exportRows && visual.exportColumns) {
      autoTable(doc, {
        startY,
        head: [visual.exportColumns],
        body: visual.exportRows
      });
    } else if (visual.kind === 'table' && visual.columns && visual.rows) {
      autoTable(doc, {
        startY,
        head: [visual.columns],
        body: visual.rows
      });
    } else if (visual.kind === 'mixed' && visual.barData?.length) {
      autoTable(doc, {
        startY,
        head: [['Secção', 'Rótulo', 'Valor']],
        body: [
          ...visual.barData.map((d) => ['Barras', d.name, String(d.valor)]),
          ...(visual.trendData || []).map((d) => ['Tendência', d.name, String(d.valor)])
        ]
      });
    } else if (visual.data && visual.data.length) {
      autoTable(doc, {
        startY,
        head: [['Período', 'Valor']],
        body: visual.data.map((d) => [d.name, d.valor])
      });
    } else {
      doc.setFontSize(10);
      doc.text('Sem tabela para exportar neste visual.', 40, startY);
    }
    doc.save(`impetus-voz-${Date.now()}.pdf`);
  }, [visual]);

  const doPrint = useCallback(() => {
    window.print();
  }, []);

  const doShare = useCallback(async () => {
    if (!visual?.title) return;
    const text = [visual.title, visual.subtitle].filter(Boolean).join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Impetus IA', text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch (_) {}
  }, [visual]);

  if (!visual || visual.kind === 'clear') return null;

  if (visual.kind === 'error' || visual.kind === 'empty') {
    if (visualOnly) {
      return (
        <div className={`voice-panel-visual voice-panel-visual--muted voice-panel-visual--bare ${className}`} aria-hidden>
          <span className="sr-only">{visual.title}. {visual.hint || 'Sem visualização.'}</span>
        </div>
      );
    }
    return (
      <div className={`voice-panel-visual voice-panel-visual--muted ${className}`}>
        <strong>{visual.title}</strong>
        <p>{visual.hint || 'Sem visualização.'}</p>
      </div>
    );
  }

  const showExport = visual.kind === 'chart' || visual.kind === 'table' || visual.kind === 'mixed';

  return (
    <div ref={printRef} className={`voice-panel-visual ${visualOnly ? 'voice-panel-visual--bare' : ''} ${className}`}>
      {!visualOnly && (
        <div className="voice-panel-visual__head">
          <div>
            <h4 className="voice-panel-visual__title">{visual.title}</h4>
            {visual.subtitle && <p className="voice-panel-visual__sub">{visual.subtitle}</p>}
          </div>
          {showExport && (
            <div className="voice-panel-visual__actions">
              <button type="button" className="voice-panel-visual__btn" onClick={downloadXlsx} title="Excel">
                <FileSpreadsheet size={16} /> Excel
              </button>
              <button type="button" className="voice-panel-visual__btn" onClick={downloadPdf} title="PDF">
                <Download size={16} /> PDF
              </button>
              <button type="button" className="voice-panel-visual__btn" onClick={doPrint} title="Imprimir">
                <Printer size={16} /> Imprimir
              </button>
              {typeof navigator !== 'undefined' && (navigator.share || navigator.clipboard?.writeText) && (
                <button type="button" className="voice-panel-visual__btn" onClick={() => void doShare()} title="Partilhar">
                  <Share2 size={16} /> Partilhar
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {visualOnly && showExport && (
        <div className="voice-panel-visual__actions voice-panel-visual__actions--icons-only">
          <button type="button" className="voice-panel-visual__icon-btn" onClick={downloadXlsx} title="Excel" aria-label="Exportar Excel">
            <FileSpreadsheet size={18} />
          </button>
          <button type="button" className="voice-panel-visual__icon-btn" onClick={downloadPdf} title="PDF" aria-label="Exportar PDF">
            <Download size={18} />
          </button>
          <button type="button" className="voice-panel-visual__icon-btn" onClick={doPrint} title="Imprimir" aria-label="Imprimir">
            <Printer size={18} />
          </button>
          {typeof navigator !== 'undefined' && (navigator.share || navigator.clipboard?.writeText) && (
            <button type="button" className="voice-panel-visual__icon-btn" onClick={() => void doShare()} title="Partilhar" aria-label="Partilhar">
              <Share2 size={18} />
            </button>
          )}
        </div>
      )}

      {visual.kind === 'chart' && visual.data?.length > 0 && (
        <div className="voice-panel-visual__chart">
          <ResponsiveContainer width="100%" height={220}>
            {visual.chartType === 'bar' ? (
              <BarChart data={visual.data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.15)" />
                <XAxis dataKey="name" tick={{ fill: '#9cc', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: '#9cc', fontSize: 11 }}
                  domain={[0, (max) => (Number.isFinite(max) && max > 0 ? Math.ceil(max * 1.12) : 1)]}
                />
                <Tooltip contentStyle={{ background: '#0a1528', border: '1px solid #1a4a7a' }} />
                <Bar dataKey="valor" fill="#00aaff" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={visual.data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.15)" />
                <XAxis dataKey="name" tick={{ fill: '#9cc', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9cc', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0a1528', border: '1px solid #1a4a7a' }} />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="#00d4ff"
                  fill="rgba(0, 212, 255, 0.25)"
                  strokeWidth={2}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {visual.kind === 'table' && visual.rows?.length > 0 && (
        <div className="voice-panel-visual__table-wrap">
          <table className="voice-panel-visual__table">
            <thead>
              <tr>
                {(visual.columns || []).map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visual.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visual.kind === 'mixed' && (
        <>
          {visual.barData?.length > 0 && (
            <div className="voice-panel-visual__chart">
              {!visualOnly && <h5 className="voice-panel-visual__section-label">Indicadores (barras)</h5>}
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={visual.barData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.15)" />
                  <XAxis dataKey="name" tick={{ fill: '#9cc', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: '#9cc', fontSize: 11 }}
                    domain={[0, (max) => (Number.isFinite(max) && max > 0 ? Math.ceil(max * 1.12) : 1)]}
                  />
                  <Tooltip contentStyle={{ background: '#0a1528', border: '1px solid #1a4a7a' }} />
                  <Bar dataKey="valor" fill="#5ee4a0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {visual.trendData?.length > 0 && (
            <div className="voice-panel-visual__chart voice-panel-visual__chart--second">
              {!visualOnly && <h5 className="voice-panel-visual__section-label">Tendência temporal</h5>}
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={visual.trendData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.15)" />
                  <XAxis dataKey="name" tick={{ fill: '#9cc', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9cc', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#0a1528', border: '1px solid #1a4a7a' }} />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="#00aaff"
                    fill="rgba(0, 170, 255, 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {(visual.extraTables || []).map((tb, idx) =>
            tb.rows?.length > 0 ? (
              <div key={idx} className="voice-panel-visual__extra-table">
                {!visualOnly && tb.title && <h5 className="voice-panel-visual__extra-title">{tb.title}</h5>}
                <div className="voice-panel-visual__table-wrap">
                  <table className="voice-panel-visual__table voice-panel-visual__table--compact">
                    <thead>
                      <tr>
                        {(tb.columns || []).map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tb.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null
          )}
        </>
      )}
    </div>
  );
}
