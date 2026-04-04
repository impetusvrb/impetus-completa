import React from 'react';

export default function TableRenderer({ title, columns = [], rows = [], className = '' }) {
  if (!rows?.length) return null;
  return (
    <div className={`smart-panel-visual__table-block ${className}`}>
      {title && <h5 className="smart-panel-visual__block-title">{title}</h5>}
      <div className="smart-panel-visual__table-scroll">
        <table className="smart-panel-visual__table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
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
  );
}
