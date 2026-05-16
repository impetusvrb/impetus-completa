'use strict';

/**
 * CAPA intelligence — correlações e pontuações assistivas (sem fechar CAPA).
 */

function recurrenceScore(history = []) {
  const opens = history.filter((h) => h.type === 'open').length;
  const reopens = history.filter((h) => h.type === 'reopen').length;
  return Math.min(100, opens * 10 + reopens * 25);
}

function capaLinkageMap(capaId, linked = []) {
  return { capa_id: capaId, ncr_refs: linked.filter((x) => x.kind === 'ncr'), lot_refs: linked.filter((x) => x.kind === 'lot') };
}

function effectivenessWindow(openedAt, closedAt) {
  if (!openedAt || !closedAt) return { days: null, score: null };
  const d = (Date.parse(closedAt) - Date.parse(openedAt)) / (86400 * 1000);
  const score = d <= 7 ? 100 : d <= 30 ? 80 : d <= 90 ? 60 : 40;
  return { days: d, score };
}

module.exports = {
  recurrenceScore,
  capaLinkageMap,
  effectivenessWindow
};
