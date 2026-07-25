import React, { useMemo, useState } from 'react';
import { mono } from './industrialModuleTokens.js';

/**
 * Grid industrial — paginação, ordenação local, seleção (sem regras de negócio).
 */
export default function IndustrialDataGrid({
  rows = [],
  columns = [],
  pageSize = 25,
  onRowSelect,
  selectedRowId = null,
  onSortChange = null
}) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      const cmp = av.localeCompare(bv, 'pt-BR', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (key) => {
    let nextDir = 'asc';
    if (sortKey === key) nextDir = sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(nextDir);
    onSortChange?.({ key, direction: nextDir });
  };

  if (!rows.length) return null;

  return (
    <div className="industrial-data-grid" data-industrial-grid-rows={rows.length}>
      <div style={{ overflow: 'auto' }}>
        <table className="data-table industrial-grid-table" style={{ width: '100%', fontSize: 12 }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                  {sortKey === c.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const rid = row.id || i;
              const active = selectedRowId != null && selectedRowId === rid;
              return (
                <tr
                  key={rid}
                  onClick={() => onRowSelect?.(row)}
                  style={{
                    cursor: onRowSelect ? 'pointer' : 'default',
                    background: active ? 'rgba(0, 212, 255, 0.06)' : 'transparent'
                  }}
                  data-industrial-row-id={rid}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      style={{
                        padding: '6px 8px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="industrial-grid-pagination" style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <button type="button" className="btn btn-ghost" style={{ borderRadius: 4 }} disabled={safePage <= 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span style={{ ...mono, color: 'var(--text-tertiary)' }}>
            Pág. {safePage + 1}/{totalPages}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ borderRadius: 4 }}
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Seguinte
          </button>
        </div>
      )}
    </div>
  );
}
