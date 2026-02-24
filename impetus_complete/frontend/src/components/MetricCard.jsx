/**
 * CARD DE MÉTRICA KPI
 * Componente reutilizável para exibir métricas
 */

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './MetricCard.css';

export default function MetricCard({ 
  icon: Icon, 
  title, 
  value, 
  growth, 
  color = 'blue',
  loading = false 
}) {
  const isPositive = growth >= 0;

  if (loading) {
    return (
      <div className="metric-card loading">
        <div className="skeleton-icon"></div>
        <div className="skeleton-content">
          <div className="skeleton-title"></div>
          <div className="skeleton-value"></div>
          <div className="skeleton-growth"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`metric-card metric-${color}`}>
      <div className="metric-icon">
        <Icon size={24} strokeWidth={2} />
      </div>
      
      <div className="metric-content">
        <h3 className="metric-title">{title}</h3>
        <div className="metric-value">{value.toLocaleString('pt-BR')}</div>
        
        {growth !== undefined && (
          <div className={`metric-growth ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{isPositive ? '+' : ''}{growth}% na semana</span>
          </div>
        )}
      </div>
    </div>
  );
}
