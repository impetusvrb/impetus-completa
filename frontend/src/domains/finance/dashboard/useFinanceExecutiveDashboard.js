/**
 * FIN-EVOLVE-002 / 2.1 — Hook de dados do painel executivo.
 * Composição R2.0 + Economic Intelligence Engine (valores calculados nos mesmos cards).
 */
import { useCallback, useEffect, useState } from 'react';
import { dashboard, nexusWallet } from '../../../services/api.js';
import { composeFinanceExecutiveView } from './financeExecutiveCompose.js';
import { runEconomicIntelligence } from '../economic-engine/economicIntelligenceEngine.js';
import { applyEconomicIntelligenceToView } from '../economic-engine/applyEconomicIntelligenceToView.js';
import { provideFinancialTwinState } from '../twin/providers/financialTwinStateProvider.js';
import { requestFinancialPredictions } from '../prediction/prediction-adapter/financialPredictionAdapter.js';
import { trackFinanceDashboardLoaded } from '../observability/financeObservability.js';

export function useFinanceExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(() => composeFinanceExecutiveView({}));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, originRes, lossRes, projRes, alertsRes, rankRes, impactRes, billingRes] =
        await Promise.all([
          dashboard.costs.getExecutiveSummary('day').catch(() => null),
          dashboard.costs.getByOrigin().catch(() => null),
          dashboard.costs.getTopLoss().catch(() => null),
          dashboard.costs.getProjectedLoss(48).catch(() => null),
          dashboard.financialLeakage.getAlerts().catch(() => null),
          dashboard.financialLeakage.getRanking().catch(() => null),
          dashboard.financialLeakage.getProjectedImpact().catch(() => null),
          nexusWallet.getDashboard().catch(() => null)
        ]);

      let billing = null;
      if (billingRes?.data && !billingRes?.data?.error) {
        const d = billingRes.data?.data ?? billingRes.data;
        billing = {
          status_label: d?.status || d?.wallet_status || 'Activo',
          summary: d?.summary || d?.message || 'Nexus Wallet / Billing disponível',
          hint: 'nexusWallet.admin'
        };
      }

      const raw = {
        costsSummary: sumRes?.data?.ok ? sumRes.data : sumRes?.data || {},
        byOrigin: originRes?.data?.ok ? originRes.data.by_origin || [] : [],
        topLoss: lossRes?.data?.ok ? lossRes.data : lossRes?.data || {},
        projectedLoss: projRes?.data?.ok ? projRes.data : projRes?.data || {},
        leakageAlerts: alertsRes?.data?.ok
          ? alertsRes.data.alerts || []
          : alertsRes?.data?.alerts || [],
        leakageRanking: rankRes?.data?.ok
          ? rankRes.data.ranking || []
          : rankRes?.data?.ranking || [],
        projectedImpact: impactRes?.data?.ok ? impactRes.data : impactRes?.data || {},
        billing
      };

      const composed = composeFinanceExecutiveView(raw);
      const economic = runEconomicIntelligence({
        ...raw,
        drivers: { units_produced: 1 },
        emitEvents: true
      });
      const enriched = applyEconomicIntelligenceToView(composed, economic);
      const twinState = provideFinancialTwinState({
        economicSnapshot: economic,
        leakageAlerts: raw.leakageAlerts,
        drivers: { units_produced: 1 },
        emitEvents: false
      });
      const predictionResult = await requestFinancialPredictions({
        forecastingClient: dashboard.forecasting,
        economicSnapshot: economic,
        twinState,
        horizon: '2d',
        emitEvents: true
      });
      setView(
        Object.freeze({
          ...enriched,
          twinSummary: twinState.overlay.summary,
          twinFinancePath: twinState.financeViewPath,
          predictions: predictionResult.ok ? predictionResult.predictions : Object.freeze([]),
          predictionError: predictionResult.ok ? null : predictionResult.error
        })
      );
      trackFinanceDashboardLoaded({
        kpiCount: enriched.kpis.length,
        alertCount: enriched.alerts.length,
        decisionCount: enriched.decisions.length,
        engine: 'EconomicIntelligenceEngine',
        twinNodes: twinState.overlay.summary.nodeCount,
        predictionCount: predictionResult.ok ? predictionResult.predictions.length : 0,
        phase: 'FIN-EVOLVE-2.4'
      });
    } catch (e) {
      setError(e?.message || 'Falha ao carregar painel executivo');
      setView(composeFinanceExecutiveView({}));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, error, view, reload: load };
}
