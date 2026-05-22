/**
 * Tema Recharts canónico — Design System Industrial 4.0 (tokens.css).
 * Usar em todo o IMPETUS: dashboards, IA voz, painel Claude, Pulse, custos, etc.
 */
export const CHART_COLORS = {
  cyan: 'var(--cyan, #00d4ff)',
  green: 'var(--green, #00ff88)',
  amber: 'var(--amber, #ffaa00)',
  red: 'var(--red, #ff4040)',
  orange: 'var(--orange, #ff6b00)',
  violet: 'var(--chart-series-3, #a78bfa)',
  grid: 'var(--chart-grid, rgba(0, 212, 255, 0.08))',
  axis: 'var(--chart-axis, rgba(148, 163, 184, 0.65))',
  tooltipBg: 'var(--bg-panel, #0f1a28)',
  tooltipBorder: 'var(--border-active, rgba(0, 212, 255, 0.35))'
};

export const CHART_SERIES_PALETTE = [
  CHART_COLORS.cyan,
  CHART_COLORS.green,
  CHART_COLORS.amber,
  CHART_COLORS.orange,
  CHART_COLORS.violet,
  CHART_COLORS.red
];

export const chartAxisTick = {
  fontSize: 10,
  fill: CHART_COLORS.axis,
  fontFamily: 'var(--font-mono, "Share Tech Mono", monospace)'
};

export const chartLegendStyle = {
  fontSize: 11,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono, "Share Tech Mono", monospace)'
};

export function chartTooltipStyle() {
  return {
    contentStyle: {
      background: CHART_COLORS.tooltipBg,
      border: `1px solid ${CHART_COLORS.tooltipBorder}`,
      borderRadius: 4,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-primary)'
    },
    labelStyle: {
      color: 'var(--text-accent)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontSize: 10
    }
  };
}

export function chartGradientId(key) {
  return `impetus-chart-grad-${key}`;
}
