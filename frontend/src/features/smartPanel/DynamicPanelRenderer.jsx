import React from 'react';
import { ShieldAlert } from 'lucide-react';
import VoicePanelVisualRenderer from '../../components/VoicePanelVisualRenderer';
import ChartRenderer from './renderers/ChartRenderer';
import TableRenderer from './renderers/TableRenderer';
import KPICardsRenderer from './renderers/KPICardsRenderer';
import ReportRenderer from './renderers/ReportRenderer';
import AlertRenderer from './renderers/AlertRenderer';
import ComparisonRenderer from './renderers/ComparisonRenderer';
import IndicatorRenderer from './renderers/IndicatorRenderer';

/**
 * @param {{ output: object, className?: string, visualOnly?: boolean }} props
 */
export default function DynamicPanelRenderer({ output, className = '', visualOnly = false }) {
  if (!output) return null;

  const bare = visualOnly ? 'smart-panel-visual--bare' : '';

  if (output.legacyVisual) {
    return (
      <div className={`smart-panel-visual smart-panel-visual--legacy ${bare} ${className}`}>
        {!visualOnly && output.title && <h4 className="smart-panel-visual__title">{output.title}</h4>}
        {!visualOnly && (
          <p className="smart-panel-visual__meta">
            Modo compatível: servidor sem /dashboard/panel-command.
          </p>
        )}
        <VoicePanelVisualRenderer visual={output.legacyVisual} visualOnly={visualOnly} />
      </div>
    );
  }

  if (output.permissionGranted === false) {
    const deniedMsg = output.denialReason || output.reportContent || 'Sem permissão.';
    return (
      <div className={`smart-panel-visual smart-panel-visual--denied ${bare} ${className}`}>
        {visualOnly ? (
          <>
            <div className="smart-panel-visual__denied-icon" aria-hidden>
              <ShieldAlert size={48} strokeWidth={1.25} />
            </div>
            <p className="smart-panel-visual__denied-msg">{deniedMsg}</p>
          </>
        ) : (
          <>
            <h4 className="smart-panel-visual__title">{output.title || 'Acesso'}</h4>
            <p className="smart-panel-visual__denied">{deniedMsg}</p>
          </>
        )}
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
  const showReport = !visualOnly && (type === 'report' || (type === 'mixed' && output.reportContent));
  const showAlerts = type === 'alert' || type === 'mixed';
  const showComparison = type === 'comparison' || type === 'mixed';
  const showIndicators = type === 'indicator' || type === 'mixed';

  return (
    <div className={`smart-panel-visual ${bare} ${className}`}>
      {!visualOnly && output.title && <h4 className="smart-panel-visual__title">{output.title}</h4>}
      {!visualOnly && output.hydratedDatasets?.length > 0 && (
        <p className="smart-panel-visual__meta">
          Dados: {output.hydratedDatasets.join(', ')}
          {output.userContextHint?.iaDepth ? ` · profundidade IA: ${output.userContextHint.iaDepth}` : ''}
        </p>
      )}

      {showAlerts && output.alerts?.length > 0 && <AlertRenderer alerts={output.alerts} visualOnly={visualOnly} />}

      {showChart && (
        <ChartRenderer
          chartType={output.chartType || 'bar'}
          data={chartSeries}
          title={visualOnly ? null : 'Visualização principal'}
          visualOnly={visualOnly}
        />
      )}
      {showTrend && (
        <ChartRenderer chartType="area" data={output.trendData} title={visualOnly ? null : 'Tendência'} visualOnly={visualOnly} />
      )}

      {showKpi && output.kpiCards?.length > 0 && <KPICardsRenderer cards={output.kpiCards} />}

      {showIndicators && output.indicators?.length > 0 && (
        <IndicatorRenderer indicators={output.indicators} visualOnly={visualOnly} />
      )}

      {showComparison && <ComparisonRenderer comparison={output.comparison} hideTableTitle={visualOnly} />}

      {output.table?.rows?.length > 0 && (
        <TableRenderer
          title={visualOnly ? null : output.table.title}
          columns={output.table.columns}
          rows={output.table.rows}
        />
      )}

      {(output.extraTables || []).map((tb, idx) =>
        tb.rows?.length > 0 ? (
          <TableRenderer
            key={idx}
            title={visualOnly ? null : tb.title}
            columns={tb.columns}
            rows={tb.rows}
            className="smart-panel-visual__extra"
          />
        ) : null
      )}

      {type === 'table' && !output.table?.rows?.length && output.extraTables?.[0] && (
        <TableRenderer
          title={visualOnly ? null : output.extraTables[0].title}
          columns={output.extraTables[0].columns}
          rows={output.extraTables[0].rows}
        />
      )}

      {showReport && <ReportRenderer content={output.reportContent} />}
    </div>
  );
}
