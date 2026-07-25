/**
 * FIN-EVOLVE-2.3 — What-if Analysis view.
 * Starts from Financial Twin / Economic Intelligence — temporary scenarios only.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboard, integrations } from '../../../../services/api.js';
import {
  provideWhatIfSession,
  setWhatIfParameter,
  calculateWhatIfScenario,
  discardWhatIfScenario,
  clearAllWhatIfScenarios
} from '../providers/whatIfScenarioProvider.js';
import { WHATIF_VARIABLES } from '../scenario-engine/whatIfVariables.js';
import { FIN_EVOLVE_23_PHASE, FIN_EVOLVE_23_PRINCIPLE } from '../scenario-engine/whatIfConstants.js';
import EconomicImpactComparisonPanel from '../comparison/EconomicImpactComparisonPanel.jsx';
import { requestFinancialPredictions } from '../../prediction/prediction-adapter/financialPredictionAdapter.js';
import PredictionWhatIfComparisonPanel from '../../prediction/prediction-view/PredictionWhatIfComparisonPanel.jsx';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase'
};

const DEFAULT_FORM = {
  energy_cost: '',
  production_volume: '',
  asset_utilization: '',
  financial_rate: '',
  inventory_valuation: '',
  leakage: '',
  cost_driver_kwh: ''
};

export default function FinanceWhatIfView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    setComparison(null);
    setPredictions([]);
    try {
      clearAllWhatIfScenarios();
      const [sumRes, originRes, lossRes, impactRes, alertsRes, twinRes] = await Promise.all([
        dashboard.costs.getExecutiveSummary('day').catch(() => null),
        dashboard.costs.getByOrigin().catch(() => null),
        dashboard.costs.getTopLoss().catch(() => null),
        dashboard.financialLeakage.getProjectedImpact().catch(() => null),
        dashboard.financialLeakage.getAlerts().catch(() => null),
        integrations.getDigitalTwinState().catch(() => null)
      ]);

      const industrialTwinState = twinRes?.data?.ok
        ? twinRes.data
        : twinRes?.data?.data || twinRes?.data || null;

      const next = provideWhatIfSession({
        costsSummary: sumRes?.data?.ok ? sumRes.data : sumRes?.data || {},
        byOrigin: originRes?.data?.ok ? originRes.data.by_origin || [] : [],
        topLoss: lossRes?.data?.ok ? lossRes.data : lossRes?.data || {},
        projectedImpact: impactRes?.data?.ok ? impactRes.data : impactRes?.data || {},
        leakageAlerts: alertsRes?.data?.ok
          ? alertsRes.data.alerts || []
          : alertsRes?.data?.alerts || [],
        industrialTwinState,
        drivers: { units_produced: 100, kwh_consumed: 40, utilization_ratio: 1 },
        emitEvents: true,
        label: 'Cenário Hub'
      });
      setSession(next);
    } catch (e) {
      setError(e?.message || 'Falha ao iniciar sessão What-if');
      const fallback = provideWhatIfSession({
        emitEvents: false,
        costsSummary: { operational: { per_day: 1200, per_month: 36000 } },
        byOrigin: [
          { label: 'energia', day: 40 },
          { label: 'parada', day: 80 }
        ],
        drivers: { units_produced: 100, kwh_consumed: 40 },
        projectedImpact: { projected_impact: 400 },
        topLoss: { total: 300 }
      });
      setSession(fallback);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
    return () => {
      clearAllWhatIfScenarios();
    };
  }, [bootstrap]);

  const onField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyAndCalculate = async () => {
    if (!session?.scenarioId) return;
    setBusy(true);
    try {
      const id = session.scenarioId;
      if (form.energy_cost !== '') {
        setWhatIfParameter(id, 'energy_cost', { mode: 'absolute', value: Number(form.energy_cost) });
      }
      if (form.production_volume !== '') {
        setWhatIfParameter(id, 'production_volume', Number(form.production_volume));
      }
      if (form.asset_utilization !== '') {
        setWhatIfParameter(id, 'asset_utilization', Number(form.asset_utilization));
      }
      if (form.financial_rate !== '') {
        setWhatIfParameter(id, 'financial_rate', {
          mappingId: 'drv-energy',
          rate: Number(form.financial_rate)
        });
      }
      if (form.inventory_valuation !== '') {
        setWhatIfParameter(id, 'inventory_valuation', {
          average_cost: Number(form.inventory_valuation),
          lot_cost: Number(form.inventory_valuation)
        });
      }
      if (form.leakage !== '') {
        setWhatIfParameter(id, 'leakage', {
          projected_impact: Number(form.leakage),
          severity: 'high'
        });
      }
      if (form.cost_driver_kwh !== '') {
        setWhatIfParameter(id, 'cost_driver', {
          metric: 'kwh_consumed',
          value: Number(form.cost_driver_kwh)
        });
      }

      const result = calculateWhatIfScenario(id, { includeTwin: true });
      if (result.ok) {
        setComparison(result.comparison);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                scenario: result.scenario,
                scenarioId: result.scenario.scenarioId
              }
            : prev
        );
        const baseline = result.scenario?.baselineEconomic || {};
        const predictionResult = await requestFinancialPredictions({
          forecastingClient: dashboard.forecasting,
          currentValues: {
            operationalCost: baseline.costReal,
            unitCost: baseline.unitCost,
            leakage: baseline.losses,
            valuation: result.comparison?.metrics?.find((metric) => metric.id === 'valuation')
              ?.current,
            efficiency: baseline.efficiency,
            costByAsset: null,
            costByLine: null,
            costByCostCenter: baseline.costReal
          },
          horizon: '2d',
          emitEvents: true
        });
        setPredictions(predictionResult.ok ? predictionResult.predictions : []);
      } else {
        setError(result.error || 'Falha no cálculo');
      }
    } finally {
      setBusy(false);
    }
  };

  const onDiscard = () => {
    if (session?.scenarioId) {
      discardWhatIfScenario(session.scenarioId);
    }
    setComparison(null);
    setPredictions([]);
    setForm(DEFAULT_FORM);
    bootstrap();
  };

  return (
    <div style={{ padding: '0.5rem' }}>
      <div
        className="impetus-card"
        style={{
          padding: '1rem',
          borderRadius: 4,
          marginBottom: '0.75rem',
          borderBottom: '2px solid transparent',
          borderImage: 'linear-gradient(90deg, var(--amber), transparent) 1'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ ...mono, color: 'var(--amber)', margin: 0 }}>
              {FIN_EVOLVE_23_PHASE} · {FIN_EVOLVE_23_PRINCIPLE}
            </p>
            <h2 style={{ margin: '8px 0 4px', fontSize: 18, letterSpacing: '0.04em' }}>
              What-if Analysis
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 720 }}>
              Simulação hipotética a partir do Twin Financeiro. Cenários temporários com{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
                {session?.scenarioId || '—'}
              </span>{' '}
              — sem persistência nem mutação operacional.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link
              to="/app/finance/twin"
              className="btn btn-ghost"
              style={{ borderRadius: 4, fontSize: 12, textDecoration: 'none' }}
            >
              Twin Financeiro
            </Link>
            <Link
              to="/app/finance"
              className="btn btn-ghost"
              style={{ borderRadius: 4, fontSize: 12, textDecoration: 'none' }}
            >
              Hub
            </Link>
          </div>
        </div>
        {error && (
          <p style={{ ...mono, color: 'var(--amber)', fontSize: 10, marginTop: 8 }}>
            {error} — composição parcial / fallback.
          </p>
        )}
        {loading && (
          <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, marginTop: 8 }}>
            A carregar estado actual…
          </p>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '0.75rem'
        }}
      >
        <section
          className="impetus-card"
          style={{ padding: '1rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
        >
          <p style={{ ...mono, color: 'var(--cyan)', margin: '0 0 10px' }}>Hipóteses</p>
          {[
            ['energy_cost', 'Custo energia (BRL/dia)'],
            ['production_volume', 'Volume produção (unidades)'],
            ['asset_utilization', 'Utilização ativos (ratio)'],
            ['financial_rate', 'Rate financeiro (drv-energy)'],
            ['inventory_valuation', 'Valuation estoque (BRL)'],
            ['leakage', 'Leakage projectado (BRL)'],
            ['cost_driver_kwh', 'Driver kWh consumidos']
          ].map(([key, label]) => (
            <label
              key={key}
              style={{ display: 'block', marginBottom: 10, fontSize: 12, color: 'var(--text-secondary)' }}
            >
              {label}
              <input
                type="number"
                value={form[key]}
                onChange={(e) => onField(key, e.target.value)}
                disabled={loading || busy}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 4,
                  padding: '6px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--border-default)',
                  background: 'var(--surface-input)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12
                }}
              />
            </label>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <button
              type="button"
              className="btn"
              disabled={loading || busy || !session}
              onClick={applyAndCalculate}
              style={{ borderRadius: 4, fontSize: 12 }}
            >
              {busy ? 'A calcular…' : 'Calcular cenário'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={loading || busy}
              onClick={onDiscard}
              style={{ borderRadius: 4, fontSize: 12 }}
            >
              Descartar
            </button>
          </div>
          <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, marginTop: 12 }}>
            Variáveis suportadas: {WHATIF_VARIABLES.map((v) => v.id).join(' · ')}
          </p>
        </section>

        <section
          className="impetus-card"
          style={{ padding: '1rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
        >
          <EconomicImpactComparisonPanel comparison={comparison} />
        </section>
      </div>
      <PredictionWhatIfComparisonPanel
        predictions={predictions}
        simulatedComparison={comparison}
      />
    </div>
  );
}
