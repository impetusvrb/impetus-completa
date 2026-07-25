/**
 * FIN-EVOLVE-002 — Painel executivo Finance (Release 2.0).
 * Composição: KPIs + alertas + insights + decisões + chart opcional.
 */
import React from 'react';
import { ImpetusChartPanel } from '../../../components/charts';
import FinanceExecutiveKpis from '../kpis/FinanceExecutiveKpis.jsx';
import FinanceAlertsPanel from '../alerts/FinanceAlertsPanel.jsx';
import FinanceInsightsPanel from '../insights/FinanceInsightsPanel.jsx';
import FinanceDecisionPanel from '../decision-panel/FinanceDecisionPanel.jsx';
import FinanceTwinHubCard from '../twin/views/FinanceTwinHubCard.jsx';
import FinanceWhatIfHubCard from '../whatif/scenario-view/FinanceWhatIfHubCard.jsx';
import FinancePredictionCards from '../prediction/prediction-view/FinancePredictionCards.jsx';
import { useFinanceExecutiveDashboard } from './useFinanceExecutiveDashboard.js';
import { FIN_EVOLVE_002_PHASE } from './financeExecutiveCompose.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase'
};

export default function FinanceExecutiveDashboard() {
  const { loading, error, view, reload } = useFinanceExecutiveDashboard();

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        className="impetus-card"
        style={{
          padding: '1rem',
          borderRadius: 4,
          marginBottom: '0.75rem',
          borderBottom: '2px solid transparent',
          borderImage: 'linear-gradient(90deg, var(--cyan), transparent) 1'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ ...mono, color: 'var(--cyan)', margin: 0 }}>
              {view.predictions?.length
                ? 'FIN-EVOLVE-2.4 · Predictive Financial Intelligence · platform consumer'
                : view.twinSummary
                  ? 'FIN-EVOLVE-2.2 · Financial Twin · perspectiva económica'
                : view.economicEngine
                  ? 'FIN-EVOLVE-2.1 · Economic Intelligence · estado financeiro'
                  : `${FIN_EVOLVE_002_PHASE} · Release 2.0 · estado financeiro`}
            </p>
            <h2 style={{ margin: '8px 0 4px', fontSize: 18, letterSpacing: '0.04em' }}>
              Visão executiva
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 720 }}>
              {view.executiveSummaryText}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={reload}
            disabled={loading}
            style={{ alignSelf: 'flex-start', borderRadius: 4 }}
          >
            {loading ? 'A actualizar…' : 'Actualizar'}
          </button>
        </div>
        {error && (
          <p style={{ ...mono, color: 'var(--amber)', fontSize: 10, marginTop: 8 }}>
            {error} — a mostrar composição parcial.
          </p>
        )}
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <FinanceExecutiveKpis kpis={view.kpis} loading={loading} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '0.75rem',
          marginBottom: '0.75rem'
        }}
      >
        <FinanceAlertsPanel alerts={view.alerts} loading={loading} />
        <FinanceInsightsPanel insights={view.insights} loading={loading} />
        <FinanceDecisionPanel decisions={view.decisions} loading={loading} />
        <FinanceTwinHubCard summary={view.twinSummary} loading={loading} />
        <FinanceWhatIfHubCard />
      </div>

      <section
        className="impetus-card"
        style={{
          padding: '1rem',
          borderRadius: 4,
          marginBottom: '0.75rem',
          borderBottom: '2px solid transparent',
          borderImage: 'linear-gradient(90deg, var(--cyan), transparent) 1'
        }}
      >
        <p style={{ ...mono, color: 'var(--cyan)', margin: '0 0 5px' }}>
          FIN-EVOLVE-2.4 · Previsões · forecast_prediction
        </p>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Previsões financeiras</h3>
        <FinancePredictionCards
          predictions={view.predictions || []}
          loading={loading}
          compact
        />
        {!loading && view.predictionError && (
          <p style={{ ...mono, color: 'var(--amber)', margin: '8px 0 0' }}>
            Plataforma preditiva indisponível — sem fallback simulado.
          </p>
        )}
      </section>

      {(loading || view.byOriginChart.length > 0) && (
        <ImpetusChartPanel
          title="Custos por origem"
          subtitle="dashboard.costs.getByOrigin · composição"
          hint="Dados reais · sem mock"
          loading={loading}
          chartType="bar"
          data={view.byOriginChart}
          chartProps={{ dataKey: 'value', nameKey: 'name' }}
          height={220}
        />
      )}
      {!loading && view.byOriginChart.length === 0 && (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>
          Gráfico por origem indisponível — sem série nesta sessão.
        </p>
      )}
    </div>
  );
}
