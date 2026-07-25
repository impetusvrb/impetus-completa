/**
 * FIN-EVOLVE-2.4 — Predictive Financial Intelligence detail view.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboard, integrations } from '../../../../services/api.js';
import { runEconomicIntelligence } from '../../economic-engine/economicIntelligenceEngine.js';
import { provideFinancialTwinState } from '../../twin/providers/financialTwinStateProvider.js';
import {
  requestFinancialPredictions,
  extractFinancialCurrentValues
} from '../prediction-adapter/financialPredictionAdapter.js';
import {
  FIN_EVOLVE_24_PHASE,
  FIN_EVOLVE_24_PRINCIPLE,
  FINANCIAL_PREDICTION_EXCLUDED_TARGETS
} from '../prediction-adapter/financialPredictionConstants.js';
import FinancePredictionCards from './FinancePredictionCards.jsx';
import FinanceTemporalPerspectivePanel from '../timeline/FinanceTemporalPerspectivePanel.jsx';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.07em',
  textTransform: 'uppercase'
};

export default function FinancePredictionView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [observed, setObserved] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, originRes, lossRes, impactRes, alertsRes, twinRes] = await Promise.all([
        dashboard.costs.getExecutiveSummary('day').catch(() => null),
        dashboard.costs.getByOrigin().catch(() => null),
        dashboard.costs.getTopLoss().catch(() => null),
        dashboard.financialLeakage.getProjectedImpact().catch(() => null),
        dashboard.financialLeakage.getAlerts().catch(() => null),
        integrations.getDigitalTwinState().catch(() => null)
      ]);
      const input = {
        costsSummary: sumRes?.data?.ok ? sumRes.data : sumRes?.data || {},
        byOrigin: originRes?.data?.ok ? originRes.data.by_origin || [] : [],
        topLoss: lossRes?.data?.ok ? lossRes.data : lossRes?.data || {},
        projectedImpact: impactRes?.data?.ok ? impactRes.data : impactRes?.data || {},
        leakageAlerts: alertsRes?.data?.ok
          ? alertsRes.data.alerts || []
          : alertsRes?.data?.alerts || [],
        industrialTwinState: twinRes?.data?.data || twinRes?.data || null,
        drivers: { units_produced: 1 },
        emitEvents: false
      };
      const economic = runEconomicIntelligence(input);
      const twin = provideFinancialTwinState({
        ...input,
        economicSnapshot: economic,
        emitEvents: false
      });
      const current = extractFinancialCurrentValues(economic, twin);
      const result = await requestFinancialPredictions({
        forecastingClient: dashboard.forecasting,
        economicSnapshot: economic,
        twinState: twin,
        horizon: '2d',
        emitEvents: true
      });
      if (!result.ok) throw new Error(result.error);
      setObserved(current);
      setPredictions(result.predictions);
    } catch (cause) {
      setError(cause?.message || 'Falha ao consultar previsões certificadas');
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ padding: '0.5rem' }}>
      <header
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
              {FIN_EVOLVE_24_PHASE} · {FIN_EVOLVE_24_PRINCIPLE}
            </p>
            <h2 style={{ margin: '8px 0 4px', fontSize: 18 }}>Predictive Financial Intelligence</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
              Consumidor de platform.prediction.public_api.v1 — sem motor preditivo local.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={load}
              disabled={loading}
              style={{ borderRadius: 4 }}
            >
              {loading ? 'A consultar…' : 'Actualizar'}
            </button>
            <Link
              to="/app/finance"
              className="btn btn-ghost"
              style={{ borderRadius: 4, textDecoration: 'none', fontSize: 12 }}
            >
              Hub Finance
            </Link>
          </div>
        </div>
        {error && (
          <p style={{ ...mono, color: 'var(--red)', margin: '8px 0 0' }}>
            {error} — nenhuma previsão é exibida sem contrato/confiança válidos.
          </p>
        )}
      </header>

      <section
        className="impetus-card"
        style={{ padding: '1rem', borderRadius: 4, marginBottom: '0.75rem' }}
      >
        <p style={{ ...mono, color: 'var(--cyan)', margin: '0 0 8px' }}>
          Wave 1 · previsões certificadas
        </p>
        <FinancePredictionCards predictions={predictions} loading={loading} />
        {!loading &&
          predictions.map((prediction) => (
            <details
              key={`explain-${prediction.prediction_id}`}
              style={{
                marginTop: 8,
                padding: 8,
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                background: 'var(--bg-tertiary)'
              }}
            >
              <summary
                style={{ ...mono, color: 'var(--cyan)', cursor: 'pointer' }}
              >
                Explicação · {prediction.label}
              </summary>
              <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                <p style={{ margin: '0 0 5px' }}>
                  Origem: <code>{prediction.origin}</code> · métrica{' '}
                  <code>{prediction.platform_metric}</code> · trace{' '}
                  <code>{prediction.trace_id}</code>
                </p>
                <p style={{ margin: '0 0 5px' }}>
                  Banda: {prediction.confidence_band_low} —{' '}
                  {prediction.confidence_band_high} · método{' '}
                  <code>{prediction.confidence_method}</code>
                </p>
                <p style={{ margin: '0 0 5px' }}>
                  Evidências: {prediction.evidence_refs.join(' · ')}
                </p>
                <p style={{ margin: 0 }}>
                  Limitações: {prediction.limitations.join(' · ')}
                </p>
              </div>
            </details>
          ))}
      </section>

      <FinanceTemporalPerspectivePanel observed={observed} predictions={predictions} />

      <section
        className="impetus-card"
        style={{ padding: '0.75rem', borderRadius: 4, marginTop: '0.75rem' }}
      >
        <p style={{ ...mono, color: 'var(--amber)', margin: '0 0 5px' }}>
          Cobertura excluída
        </p>
        {(FINANCIAL_PREDICTION_EXCLUDED_TARGETS || []).map((target) => (
          <p key={target.id} style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>
            {target.label}: {target.reason} ({target.gap})
          </p>
        ))}
      </section>
    </div>
  );
}

