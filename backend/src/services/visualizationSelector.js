'use strict';

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function chooseVisualization(event) {
  const type = String(event?.type || '').toLowerCase();
  const title = String(event?.payload?.title || '').toLowerCase();
  const value = toNum(event?.payload?.value);
  const growth = toNum(event?.payload?.growth);
  const hasNumeric = value != null;
  const hasGrowth = growth != null;

  if (type.includes('sem_dados')) return 'fallback';
  if (event?.criticality === 'high' || type.includes('alerta')) return 'alert';
  if (type.includes('tendencia') || title.includes('tend')) return 'line';
  if (type.includes('compar') || type.includes('ranking') || type.includes('setor')) return 'bar';
  if (type.includes('propor') || title.includes('distrib')) return 'pie';
  if (type.includes('lista') || type.includes('anomalia') || type.includes('recorr')) return 'table';
  if (hasNumeric && hasGrowth) return 'line';
  if (hasNumeric) return 'kpi';
  return 'insight';
}

module.exports = { chooseVisualization };
