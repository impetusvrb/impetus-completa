import React from 'react';
import VoicePanelVisualRenderer from '../../components/VoicePanelVisualRenderer';
import ChartRenderer from './renderers/ChartRenderer';
import TableRenderer from './renderers/TableRenderer';
import KPICardsRenderer from './renderers/KPICardsRenderer';
import ReportRenderer from './renderers/ReportRenderer';
import AlertRenderer from './renderers/AlertRenderer';
import ComparisonRenderer from './renderers/ComparisonRenderer';
import IndicatorRenderer from './renderers/IndicatorRenderer';

/**
 * @param {{ output: object, className?: string }} props
 */
export default function DynamicPanelRenderer({ output, className = '' }) {
  if (!output) return null;

  if (output.legacyVisual) {
    return (
      <div className={`smart-panel-visual smart-panel-visual--legacy ${className}`}>
        {output.title && <h4 className="smart-panel-visual__title">{output.title}</h4>}
        <p className="smart-panel-visual__meta">
          Modo compatível: o servidor ainda não expõe /dashboard/panel-command. A usar o motor de voz clássico.
        </p>
        <VoicePanelVisualRenderer visual={output.legacyVisual} />
      </div>
    );
  }

  if (output.permissionGranted === false) {
    return (
      <div className={`smart-panel-visual smart-panel-visual--denied ${className}`}>
        <h4 className="smart-panel-visual__title">{output.title || 'Acesso'}</h4>
        <p className="smart-panel-visual__denied">{output.denialReason || output.reportContent || 'Sem permissão.'}</p>
      </div>
    );
  }

  const type = output.type || 'mixed';
  const showChart =
    (type === 'chart' || type === 'mixed' || type === 'comparison') &&
    (output.chartData?.length > 0 || output.barData?.length > 0);
  const chartSeries = output.chartData?.length ? output.chartData : output.barData;
  const showTrend = (type === 'chart' || type === 'mixed') && output.trendData?.length > 0;
  const showKpi = type === 'kpi_cards' || type === 'mixed';
  const showReport = type === 'report' || (type === 'mixed' && output.reportContent);
  const showAlerts = type === 'alert' || type === 'mixed';
  const showComparison = type === 'comparison' || type === 'mixed';
  const showIndicators = type === 'indicator' || type === 'mixed';

  return (
    <div className={`smart-panel-visual ${className}`}>
      {output.title && <h4 className="smart-panel-visual__title">{output.title}</h4>}
      {output.hydratedDatasets?.length > 0 && (
        <p className="smart-panel-visual__meta">
          Dados: {output.hydratedDatasets.join(', ')}
          {output.userContextHint?.iaDepth ? ` · profundidade IA: ${output.userContextHint.iaDepth}` : ''}
        </p>
      )}

      {showAlerts && output.alerts?.length > 0 && <AlertRenderer alerts={output.alerts} />}

      {showChart && (
        <ChartRenderer chartType={output.chartType || 'bar'} data={chartSeries} title="Visualização principal" />
      )}
      {showTrend && (
        <ChartRenderer chartType="area" data={output.trendData} title="Série / tendência" />
      )}

      {showKpi && output.kpiCards?.length > 0 && <KPICardsRenderer cards={output.kpiCards} />}

      {showIndicators && output.indicators?.length > 0 && <IndicatorRenderer indicators={output.indicators} />}

      {showComparison && <ComparisonRenderer comparison={output.comparison} />}

      {output.table?.rows?.length > 0 && (
        <TableRenderer
          title={output.table.title}
          columns={output.table.columns}
          rows={output.table.rows}
        />
      )}

      {(output.extraTables || []).map((tb, idx) =>
        tb.rows?.length > 0 ? (
          <TableRenderer
            key={idx}
            title={tb.title}
            columns={tb.columns}
            rows={tb.rows}
            className="smart-panel-visual__extra"
          />
        ) : null
      )}

      {type === 'table' && !output.table?.rows?.length && output.extraTables?.[0] && (
        <TableRenderer
          title={output.extraTables[0].title}
          columns={output.extraTables[0].columns}
          rows={output.extraTables[0].rows}
        />
      )}

      {showReport && <ReportRenderer content={output.reportContent} />}
    </div>
  );
}
