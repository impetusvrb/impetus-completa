/**
 * Centro de Comando Industrial — Prompt v3 completo.
 * Grid 4 colunas; gráficos, indicadores, relatórios, diagramas; tudo IA onde aplicável.
 * Suporta layout personalizado por perfil (API /dashboard/personalizado) ou fallback por cargo.
 */
import React, { useMemo, useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { getLayoutPorCargo } from './LayoutPorCargo';
import { dashboard } from '../../../services/api';
import WidgetKpiCards from './WidgetKpiCards';
import WidgetResumoExecutivo from './WidgetResumoExecutivo';
import WidgetAlertas from './WidgetAlertas';
import WidgetGraficoTendencia from './WidgetGraficoTendencia';
import WidgetPergunteIA from './WidgetPergunteIA';
import WidgetRelatorioIA from './WidgetRelatorioIA';
import WidgetGraficoProducaoDemanda from './WidgetGraficoProducaoDemanda';
import WidgetGraficoCustosSetor from './WidgetGraficoCustosSetor';
import WidgetGraficoMargem from './WidgetGraficoMargem';
import WidgetIndicadoresExecutivos from './WidgetIndicadoresExecutivos';
import WidgetCentroPrevisao from './WidgetCentroPrevisao';
import WidgetCentroCustos from './WidgetCentroCustos';
import WidgetMapaVazamentos from './WidgetMapaVazamentos';
import WidgetPerformance from './WidgetPerformance';
import WidgetGargalos from './WidgetGargalos';
import WidgetDesperdicio from './WidgetDesperdicio';
import WidgetInsightsIA from './WidgetInsightsIA';
import WidgetDiagramaIndustrial from './WidgetDiagramaIndustrial';
import WidgetManutencao from './WidgetManutencao';
import WidgetQualidade from './WidgetQualidade';
import WidgetEstoque from './WidgetEstoque';
import WidgetLogistica from './WidgetLogistica';
import WidgetOperacoes from './WidgetOperacoes';
import WidgetEnergia from './WidgetEnergia';
import WidgetRastreabilidade from './WidgetRastreabilidade';
import WidgetReceitas from './WidgetReceitas';
import './CentroComando.css';

const WIDGET_COMPONENTS = {
  resumo_executivo: WidgetResumoExecutivo,
  kpi_cards: WidgetKpiCards,
  alertas: WidgetAlertas,
  grafico_tendencia: WidgetGraficoTendencia,
  pergunte_ia: WidgetPergunteIA,
  relatorio_ia: WidgetRelatorioIA,
  grafico_producao_demanda: WidgetGraficoProducaoDemanda,
  grafico_custos_setor: WidgetGraficoCustosSetor,
  grafico_margem: WidgetGraficoMargem,
  indicadores_executivos: WidgetIndicadoresExecutivos,
  centro_previsao: WidgetCentroPrevisao,
  centro_custos: WidgetCentroCustos,
  mapa_vazamentos: WidgetMapaVazamentos,
  performance: WidgetPerformance,
  gargalos: WidgetGargalos,
  desperdicio: WidgetDesperdicio,
  insights_ia: WidgetInsightsIA,
  diagrama_industrial: WidgetDiagramaIndustrial,
  manutencao: WidgetManutencao,
  qualidade: WidgetQualidade,
  estoque: WidgetEstoque,
  logistica: WidgetLogistica,
  operacoes: WidgetOperacoes,
  energia: WidgetEnergia,
  rastreabilidade: WidgetRastreabilidade,
  receitas: WidgetReceitas
};

function getWidgetComponent(id) {
  return WIDGET_COMPONENTS[id] || null;
}

export default function CentroComando() {
  const userStr = typeof localStorage !== 'undefined' ? localStorage.getItem('impetus_user') : null;
  const user = userStr ? (() => { try { return JSON.parse(userStr); } catch { return null; } })() : null;
  const role = user?.role ?? '';
  const department = user?.functional_area ?? user?.area ?? '';

  const [personalizado, setPersonalizado] = useState(null);

  useEffect(() => {
    dashboard.getPersonalizado()
      .then((r) => {
        if (r?.data?.ok) setPersonalizado(r.data);
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('[CentroComando] /dashboard/personalizado falhou:', err?.response?.status ?? err?.message);
      });
  }, []);

  const widgets = useMemo(() => {
    if (personalizado?.layout?.length) return personalizado.layout;
    return getLayoutPorCargo(role, department);
  }, [personalizado, role, department]);

  const titulo = personalizado?.perfil?.titulo_dashboard ?? 'Centro de Comando Industrial';
  const subtitulo = personalizado?.perfil?.subtitulo
    ? personalizado.perfil.subtitulo
    : `Visão para ${role ? role.replace(/_/g, ' ') : 'colaborador'}`;

  return (
    <Layout>
      <div className="cc">
        <header className="cc__header">
          <h1 className="cc__title">{titulo}</h1>
          <p className="cc__subtitle">{subtitulo}</p>
        </header>
        <div className="cc__grid">
          {widgets.map((w) => {
            const Component = getWidgetComponent(w.id);
            if (!Component) return null;
            const span = w.position?.width === 2 ? 2 : 1;
            return (
              <div
                key={w.id}
                className="cc__cell"
                style={{ gridColumn: `span ${span}` }}
              >
                <Component />
              </div>
            );
          })}
        </div>
        <footer className="ticker">
          <div className="ticker-label">// LIVE</div>
          <div className="ticker-items">
            <div className="ticker-item">PROD/H <span className="val-green">— un</span></div>
            <div className="ticker-item">ENERGIA <span className="val-amber">— kWh</span></div>
            <div className="ticker-item">TURNO <span>1</span></div>
            <div className="ticker-item">OPERADORES <span>— ativos</span></div>
            <div className="ticker-item">QUALIDADE <span className="val-green">—% aprovação</span></div>
            <div className="ticker-item">UPTIME <span className="val-green">—%</span></div>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
