/**
 * FIN-EVOLVE-2.2 — Financial Twin View (composition over industrial twin).
 * Does not implement a parallel Digital Twin — overlays Finance perspective.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboard, integrations } from '../../../../services/api.js';
import { provideFinancialTwinState } from '../providers/financialTwinStateProvider.js';
import {
  requestFinancialPredictions,
  extractFinancialCurrentValues
} from '../../prediction/prediction-adapter/financialPredictionAdapter.js';
import FinanceTemporalPerspectivePanel from '../../prediction/timeline/FinanceTemporalPerspectivePanel.jsx';
import {
  trackTwinOpened,
  trackTwinNodeSelected,
  trackTwinOverlayLoaded
} from '../../observability/financeObservability.js';
import { FIN_EVOLVE_22_PHASE, FIN_EVOLVE_22_PRINCIPLE } from '../overlay/financialTwinOverlay.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase'
};

function money(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
}

export default function FinanceTwinFinancialView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [state, setState] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
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

      const industrialTwinState = twinRes?.data?.ok
        ? twinRes.data
        : twinRes?.data?.data || twinRes?.data || null;

      const composed = provideFinancialTwinState({
        costsSummary: sumRes?.data?.ok ? sumRes.data : sumRes?.data || {},
        byOrigin: originRes?.data?.ok ? originRes.data.by_origin || [] : [],
        topLoss: lossRes?.data?.ok ? lossRes.data : lossRes?.data || {},
        projectedImpact: impactRes?.data?.ok ? impactRes.data : impactRes?.data || {},
        leakageAlerts: alertsRes?.data?.ok
          ? alertsRes.data.alerts || []
          : alertsRes?.data?.alerts || [],
        industrialTwinState,
        drivers: { units_produced: 1 },
        emitEvents: true
      });
      setState(composed);
      const predictionResult = await requestFinancialPredictions({
        forecastingClient: dashboard.forecasting,
        twinState: composed,
        currentValues: {
          operationalCost: composed.economic.consolidated,
          unitCost: composed.economic.unitCost,
          leakage: composed.economic.losses,
          valuation: composed.overlay.nodes.reduce(
            (sum, node) => sum + (Number(node.financial?.valuation) || 0),
            0
          ),
          efficiency: composed.economic.efficiency,
          costByAsset: composed.overlay.nodes.reduce(
            (sum, node) => sum + (Number(node.financial?.cost_by_asset) || 0),
            0
          ),
          costByLine: composed.overlay.nodes.reduce(
            (sum, node) => sum + (Number(node.financial?.cost_by_line) || 0),
            0
          ),
          costByCostCenter: composed.overlay.nodes.reduce(
            (sum, node) => sum + (Number(node.financial?.current_cost) || 0),
            0
          )
        },
        horizon: '2d',
        emitEvents: true
      });
      const current = extractFinancialCurrentValues({}, composed);
      setObserved({
        ...current,
        unitCost: composed.economic.unitCost,
        leakage: composed.economic.losses,
        efficiency: composed.economic.efficiency
      });
      setPredictions(predictionResult.ok ? predictionResult.predictions : []);
      trackTwinOpened({ source: 'finance_twin_view', nodes: composed.overlay.nodes.length });
      trackTwinOverlayLoaded({ nodeCount: composed.overlay.nodes.length });
    } catch (e) {
      setError(e?.message || 'Falha ao compor perspectiva financeira');
      setPredictions([]);
      setState(
        provideFinancialTwinState({
          emitEvents: false,
          costsSummary: { operational: { per_day: 0, per_month: 0 } },
          byOrigin: []
        })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = state?.overlay?.nodes?.find((n) => n.asset_id === selectedId) || null;

  return (
    <div style={{ padding: '0.5rem' }}>
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
              {FIN_EVOLVE_22_PHASE} · {FIN_EVOLVE_22_PRINCIPLE}
            </p>
            <h2 style={{ margin: '8px 0 4px', fontSize: 18, letterSpacing: '0.04em' }}>
              Perspectiva financeira do Digital Twin
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 720 }}>
              Overlay económico composto sobre o Twin industrial — sem Twin paralelo, sem simulador.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost" style={{ borderRadius: 4 }} onClick={load} disabled={loading}>
              {loading ? 'A compor…' : 'Actualizar'}
            </button>
            <Link
              to="/app/finance/prediction"
              className="btn btn-ghost"
              style={{ borderRadius: 4, textDecoration: 'none', fontSize: 12 }}
            >
              Previsões
            </Link>
            <Link
              to={state?.industrialTwinDeepLink || '/app/manutencao/manuia?tab=digital-twin&perspective=finance'}
              className="btn btn-ghost"
              style={{ borderRadius: 4, textDecoration: 'none', fontSize: 12 }}
            >
              Abrir Twin industrial
            </Link>
            <Link to="/app/finance" className="btn btn-ghost" style={{ borderRadius: 4, textDecoration: 'none', fontSize: 12 }}>
              Hub Finance
            </Link>
          </div>
        </div>
        {error && (
          <p style={{ ...mono, color: 'var(--amber)', fontSize: 10, marginTop: 8 }}>
            {error} — composição parcial a partir de contratos Finance.
          </p>
        )}
      </div>

      {state && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
            marginBottom: '0.75rem'
          }}
        >
          {[
            { label: 'Custo unitário', value: money(state.economic.unitCost), color: 'var(--cyan)' },
            {
              label: 'Eficiência',
              value: state.economic.efficiency != null ? `${Number(state.economic.efficiency).toFixed(1)}%` : '—',
              color: 'var(--green)'
            },
            { label: 'Perdas', value: money(state.economic.losses), color: 'var(--red)' },
            { label: 'Consolidado', value: money(state.economic.consolidated), color: 'var(--cyan)' },
            {
              label: 'Nós overlay',
              value: String(state.overlay.summary.nodeCount),
              color: 'var(--text-primary)'
            },
            {
              label: 'Join operacional',
              value: String(state.overlay.nodes.filter((n) => n.operational?.joined).length),
              color: 'var(--text-secondary)'
            }
          ].map((k) => (
            <div
              key={k.label}
              className="impetus-card"
              style={{ padding: '0.75rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
            >
              <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>{k.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: k.color, marginTop: 4 }}>
                {k.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        <FinanceTemporalPerspectivePanel observed={observed} predictions={predictions} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1fr) minmax(280px, 1.2fr)',
          gap: '0.75rem'
        }}
      >
        <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
          <h3 style={{ ...mono, color: 'var(--cyan)', margin: '0 0 10px', fontSize: 11 }}>
            Activos · overlay financeiro
          </h3>
          {loading && <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>A carregar…</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {(state?.overlay?.nodes || []).map((n) => (
              <li key={n.asset_id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(n.asset_id);
                    trackTwinNodeSelected({ assetId: n.asset_id, joined: n.operational?.joined });
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background:
                      selectedId === n.asset_id ? 'var(--bg-tertiary)' : 'transparent',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 4,
                    padding: '8px 10px',
                    marginBottom: 6,
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{n.asset_label || n.asset_id}</div>
                  <div style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {n.asset_type} · {money(n.financial.current_cost)} · risco{' '}
                    {n.financial.operational_risk?.level}
                    {n.operational?.joined ? ' · joined' : ''}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
          <h3 style={{ ...mono, color: 'var(--cyan)', margin: '0 0 10px', fontSize: 11 }}>
            Estado económico do nó
          </h3>
          {!selected && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Seleccione um activo para ver custo corrente, valuation, perdas, eficiência e impacto.
            </p>
          )}
          {selected && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {[
                ['Activo', selected.asset_label || selected.asset_id],
                ['Centro de custo', selected.cost_center_id || '—'],
                ['Linha', selected.line_id || '—'],
                ['Custo corrente', money(selected.financial.current_cost)],
                ['Custo acumulado', money(selected.financial.accumulated_cost)],
                ['Valuation', money(selected.financial.valuation)],
                ['Perdas', money(selected.financial.losses)],
                [
                  'Eficiência',
                  selected.financial.efficiency != null
                    ? `${Number(selected.financial.efficiency).toFixed(1)}%`
                    : '—'
                ],
                ['Impacto', money(selected.financial.financial_impact)],
                ['Custo / activo', money(selected.financial.cost_by_asset)],
                ['Custo / linha', money(selected.financial.cost_by_line)],
                ['Risco', selected.financial.operational_risk?.level],
                [
                  'Twin industrial',
                  selected.operational?.joined
                    ? selected.operational.twin_node_id
                    : selected.twin_node_ref || 'sem join espacial'
                ]
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '6px 0',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {k}
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
              <p style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)', marginTop: 12 }}>
                Contratos: {(selected.evidence?.contracts || []).join(' · ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
