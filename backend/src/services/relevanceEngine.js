'use strict';

function normalize(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function scoreByRole(role) {
  const r = normalize(role);
  if (r === 'ceo') return 1.25;
  if (r === 'diretor') return 1.15;
  if (r === 'gerente') return 1.08;
  if (r === 'coordenador' || r === 'supervisor') return 1.02;
  return 0.96;
}
function scoreByAreaMatch(user, event) {
  const area = normalize(user?.functional_area || user?.area || user?.department);
  const setor = normalize(event?.setor);
  if (!area || !setor) return 1;
  if (area.includes(setor) || setor.includes(area)) return 1.3;
  if (area.includes('rh') && setor.includes('pessoas')) return 1.25;
  if (area.includes('produc') && setor.includes('operac')) return 1.15;
  return 0.9;
}
function scoreByDescription(user, event) {
  const desc = normalize(user?.hr_responsibilities || user?.descricao_funcional || user?.descricao);
  if (!desc) return 1;
  const tokens = [event?.type, event?.setor, event?.payload?.key, event?.payload?.title]
    .filter(Boolean)
    .map((v) => normalize(v).replace(/_/g, ' '));
  const hit = tokens.some((t) => desc.includes(t));
  return hit ? 1.35 : 0.95;
}
function scoreByCriticality(event) {
  const c = normalize(event?.criticality || 'low');
  if (c === 'high') return 1.35;
  if (c === 'medium') return 1.12;
  return 0.95;
}
function scoreByRecency(event) {
  const ts = new Date(event?.timestamp || event?.created_at || Date.now()).getTime();
  if (!Number.isFinite(ts)) return 1;
  const ageMin = (Date.now() - ts) / 60000;
  if (ageMin <= 30) return 1.18;
  if (ageMin <= 180) return 1.08;
  if (ageMin <= 1440) return 1;
  return 0.92;
}
function computeRelevance(user, event) {
  return Math.round(
    50 *
      scoreByRole(user?.role) *
      scoreByAreaMatch(user, event) *
      scoreByDescription(user, event) *
      scoreByCriticality(event) *
      scoreByRecency(event)
  );
}
function rankRelevantEvents(user, events = []) {
  return [...events].map((evt) => ({ ...evt, relevance: computeRelevance(user, evt) })).filter((evt) => evt.relevance >= 45).sort((a, b) => b.relevance - a.relevance);
}

module.exports = { rankRelevantEvents, computeRelevance };
