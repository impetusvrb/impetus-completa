/**
 * TABLE COMPONENT
 * Tabela reutilizável com paginação, ordenação e filtros
 */

import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import './Table.css';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'Nenhum registro encontrado',
  onRowClick,
  getRowClassName,
  pagination,
  onPageChange,
  sortable = false,
  sortBy,
  sortOrder = 'asc',
  onSort,
  mobileCardLayout = true
}) {
  const handleSort = (column) => {
    if (!sortable || !column.sortable) return;
    
    const newOrder = sortBy === column.key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort && onSort(column.key, newOrder);
  };

  const getSortIcon = (column) => {
    if (!column.sortable) return null;
    
    if (sortBy === column.key) {
      return sortOrder === 'asc' ? 
        <ChevronUp size={16} /> : 
        <ChevronDown size={16} />;
    }
    
    return <ChevronsUpDown size={16} className="sort-icon-inactive" />;
  };

  const cardColumns = (() => {
    const vis = columns.filter((c) => !c.hideInCard);
    return vis.length ? vis : columns;
  })();

  const wrapperClassName = [
    'table-wrapper',
    mobileCardLayout && 'table-wrapper--responsive-cards',
    !loading && data.length === 0 && 'table-wrapper--empty'
  ]
    .filter(Boolean)
    .join(' ');

  const renderCellValue = (col, row) =>
    col.render ? col.render(row[col.key], row) : row[col.key];

  // Loading skeleton
  if (loading) {
    return (
      <div className={wrapperClassName}>
        <table className="table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, idx) => (
              <tr key={idx} className="skeleton-row">
                {columns.map((_, colIdx) => (
                  <td key={colIdx}>
                    <div className="skeleton-cell"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {mobileCardLayout && (
          <div className="table-cards table-cards--skeleton" aria-hidden="true">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="table-card table-card--skeleton">
                {[...Array(Math.min(4, Math.max(1, cardColumns.length || 3)))].map((__, i) => (
                  <div key={i} className="table-card__row">
                    <div className="skeleton-cell table-card__skeleton-label" />
                    <div className="skeleton-cell table-card__skeleton-value" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={wrapperClassName}>
        <table className="table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="table-empty">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th 
                key={col.key} 
                style={{ width: col.width }}
                className={col.sortable ? 'sortable' : ''}
                onClick={() => handleSort(col)}
              >
                <div className="th-content">
                  <span>{col.label}</span>
                  {getSortIcon(col)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr 
              key={row.id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={[onRowClick ? 'clickable' : '', getRowClassName ? getRowClassName(row) : '']
                .filter(Boolean)
                .join(' ')}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {renderCellValue(col, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {mobileCardLayout && (
        <div className="table-cards" role="list">
          {data.map((row, rowIdx) => {
            const rowKey = row.id ?? rowIdx;
            const rowClass = [onRowClick ? 'table-card--clickable' : '', getRowClassName ? getRowClassName(row) : '']
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={rowKey}
                role="listitem"
                className={`table-card ${rowClass}`.trim()}
                onClick={() => onRowClick && onRowClick(row)}
                onKeyDown={(e) => {
                  if (!onRowClick) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {cardColumns.map((col) => (
                  <div key={col.key} className="table-card__row">
                    <span className="table-card__label">{col.label}</span>
                    <div className="table-card__value">{renderCellValue(col, row)}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {pagination && (
        <TablePagination 
          pagination={pagination}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

/**
 * TABLE PAGINATION COMPONENT
 */
export function TablePagination({ pagination, onPageChange }) {
  const { total, limit, offset } = pagination;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(offset - limit);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(offset + limit);
    }
  };

  const handlePageClick = (page) => {
    const newOffset = (page - 1) * limit;
    onPageChange(newOffset);
  };

  // Calcular páginas a mostrar
  const getPageNumbers = () => {
    const pages = [];
    const maxPages = 7;
    
    if (totalPages <= maxPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="table-pagination">
      <div className="pagination-info">
        Mostrando {offset + 1} a {Math.min(offset + limit, total)} de {total} registros
      </div>
      
      <div className="pagination-controls">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="pagination-btn"
          aria-label="Página anterior"
        >
          <ChevronLeft size={18} />
        </button>

        {getPageNumbers().map((page, idx) => (
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
            >
              {page}
            </button>
          )
        ))}

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="pagination-btn"
          aria-label="Próxima página"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
