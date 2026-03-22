/**
 * Registro de widgets do Dashboard Inteligente Dinâmico.
 * Cada id retornado pelo backend é mapeado para um componente.
 */
import React from 'react';
import CenterWidget from './CenterWidget';
import AlertsWidget from './AlertsWidget';
import SmartSummaryWidget from './SmartSummaryWidget';
import IndicatorsWidget from './IndicatorsWidget';
import GenericWidget from './GenericWidget';
import CadastrarComIAWidget from './CadastrarComIAWidget';

const WIDGET_MAP = {
  center_predictions: CenterWidget,
  industrial_map: CenterWidget,
  cost_center: CenterWidget,
  leak_map: CenterWidget,
  central_ai: CenterWidget,
  alerts_panel: AlertsWidget,
  plc_alerts: AlertsWidget,
  smart_summary: SmartSummaryWidget,
  indicators: IndicatorsWidget,
  trend_chart: GenericWidget,
  recent_interactions: GenericWidget,
  insights_list: GenericWidget,
  maintenance_cards: GenericWidget
};

export function getWidgetComponent(widgetId) {
  return WIDGET_MAP[widgetId] || GenericWidget;
}

export { CenterWidget, AlertsWidget, SmartSummaryWidget, IndicatorsWidget, GenericWidget, CadastrarComIAWidget };
