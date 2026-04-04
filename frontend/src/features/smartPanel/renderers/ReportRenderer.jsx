import React from 'react';

export default function ReportRenderer({ content = '' }) {
  if (!String(content || '').trim()) return null;
  return (
    <div className="smart-panel-visual__report">
      <h5 className="smart-panel-visual__block-title">Relatório</h5>
      <div className="smart-panel-visual__report-body">{content}</div>
    </div>
  );
}
