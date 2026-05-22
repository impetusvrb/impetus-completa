/**
 * Painel industrial para gráficos — título, subtítulo, hint, estado vazio.
 */
import React from 'react';
import ImpetusChart from './ImpetusChart';
import './ImpetusCharts.css';

export default function ImpetusChartPanel({
  icon: Icon,
  title = 'Gráfico',
  subtitle,
  hint,
  loading = false,
  error = false,
  errorMessage = 'Gráfico indisponível.',
  className = '',
  children,
  chartType,
  data,
  chartProps = {},
  height
}) {
  if (loading) {
    return (
      <div className={`impetus-chart-panel ${className}`}>
        <div className="impetus-chart-panel__header">
          <div className="impetus-chart-panel__skeleton impetus-chart-panel__skeleton--title" />
        </div>
        <div className="impetus-chart-panel__skeleton impetus-chart-panel__skeleton--chart" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`impetus-chart-panel impetus-chart-panel--error ${className}`}>
        <div className="impetus-chart-panel__header">
          {Icon && <Icon size={20} />}
          <span>{title}</span>
        </div>
        <p className="impetus-chart-panel__empty">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className={`impetus-chart-panel ${className}`}>
      <div className="impetus-chart-panel__header">
        {Icon && <Icon size={20} />}
        <div className="impetus-chart-panel__titles">
          <span className="impetus-chart-panel__title">{title}</span>
          {subtitle && <span className="impetus-chart-panel__subtitle">{subtitle}</span>}
        </div>
      </div>
      {hint && <p className="impetus-chart-panel__hint">{hint}</p>}
      <div className="impetus-chart-panel__body">
        {children || (
          <ImpetusChart chartType={chartType} data={data} height={height} {...chartProps} />
        )}
      </div>
    </div>
  );
}
