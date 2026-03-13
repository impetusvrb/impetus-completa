import React from 'react';

export default function Table({ columns = [], data = [], keyField = 'id' }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: 12, borderBottom: '2px solid #e5e7eb' }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row[keyField] ?? row.id ?? Math.random()}>
            {columns.map((c) => (
              <td key={c.key} style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                {c.render ? c.render(row[c.key], row) : row[c.key] ?? '-'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
