import { useCallback, useState } from 'react';
import { calculateReorderPoint } from '../utils/stockOptimizer';

/**
 * Insights acionáveis derivados dos dados (sem chamada externa).
 * Substituível depois por Claude/API mantendo o mesmo formato.
 */
function buildInsightsFromData(profile, { twins = [], orders = [], stock = [] }) {
  const out = [];

  const criticalTwins = twins.filter((t) => t.status === 'critical' || (t.prediction?.failureProbability ?? 0) > 75);
  if (criticalTwins.length && ['gerente', 'supervisor', 'analista_pcm'].includes(profile)) {
    out.push({
      type: 'critical',
      title: `${criticalTwins.length} equipamento(s) em risco elevado`,
      description: criticalTwins
        .slice(0, 3)
        .map((t) => `${t.name}: ${t.prediction?.aiMessage || 'Revisar imediatamente.'}`)
        .join(' '),
      estimatedValue: null,
      relevantFor: [profile]
    });
  }

  const pendingP12 = orders.filter((o) => ['P1', 'P2'].includes(o.priority) && o.status === 'pending_approval');
  if (pendingP12.length && profile === 'gerente') {
    out.push({
      type: 'warning',
      title: 'OS P1/P2 aguardando sua aprovação',
      description: `${pendingP12.length} ordem(ns) críticas/urgentes pendentes. Aprove na seção de aprovações para liberar execução.`,
      estimatedValue: null,
      relevantFor: ['gerente']
    });
  }

  const pendingP34 = orders.filter((o) => ['P3', 'P4'].includes(o.priority) && o.status === 'pending_approval');
  if (pendingP34.length && (profile === 'supervisor' || profile === 'gerente')) {
    out.push({
      type: 'opportunity',
      title: 'OS P3/P4 na fila de aprovação',
      description: `${pendingP34.length} ordem(ns) de rotina aguardando validação do turno.`,
      estimatedValue: null,
      relevantFor: [profile]
    });
  }

  if (profile === 'gerente') {
    const oeeHint = twins.length ? Math.round(twins.reduce((s, t) => s + (t.sensors?.efficiency ?? 0), 0) / twins.length) : null;
    if (oeeHint != null) {
      out.push({
        type: 'result',
        title: 'Eficiência média reportada pelos gêmeos',
        description: `Indicador consolidado ~${oeeHint}% nos ativos monitorados. Use com dados reais de OEE quando integrados ao MES.`,
        estimatedValue: null,
        relevantFor: ['gerente']
      });
    }
  }

  if (profile === 'supervisor') {
    const openOs = orders.filter((o) => o.status === 'open' || o.status === 'in_progress').length;
    if (openOs) {
      out.push({
        type: 'result',
        title: 'OS em execução no período',
        description: `${openOs} ordem(ns) abertas ou em andamento. Priorize alertas críticos antes de rotina.`,
        estimatedValue: null,
        relevantFor: ['supervisor']
      });
    }
  }

  if (profile === 'analista_pcm') {
    const low = stock.filter((it) => {
      const opt = calculateReorderPoint(it, twins);
      return (it.qty ?? 0) <= opt.reorderPoint || opt.urgency === 'critical';
    });
    if (low.length) {
      out.push({
        type: 'warning',
        title: 'Itens com ponto de pedido elevado pelo risco dos gêmeos',
        description: `${low.length} SKU(s) com urgência revisada. Ver tabela de estoque para sugestão IA e lead time.`,
        estimatedValue: null,
        relevantFor: ['analista_pcm']
      });
    }
  }

  return out.slice(0, 8);
}

export function useAiInsights(profile) {
  const [insights, setInsights] = useState([]);

  const fetchInsights = useCallback(
    (data) => {
      if (!profile || profile === 'unauthorized') {
        setInsights([]);
        return;
      }
      setInsights(buildInsightsFromData(profile, data || {}));
    },
    [profile]
  );

  return { insights, fetchInsights };
}
