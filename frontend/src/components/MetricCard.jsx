import React from 'react';

export default function MetricCard({ icon: Icon, title, value, growth, color = 'blue', onClick }) {
  return (
    <div className={`metric-card metric-card--${color}`} onClick={onClick} role={onClick ? 'button' : undefined} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {Icon && <Icon size={20} />}
      <div>
        <span className="metric-card__value">{value ?? '-'}</span>
        <span className="metric-card__title">{title}</span>
        {growth != null && <span className="metric-card__growth">{growth > 0 ? '+' : ''}{growth}%</span>}
      </div>
    </div>
  );
}
