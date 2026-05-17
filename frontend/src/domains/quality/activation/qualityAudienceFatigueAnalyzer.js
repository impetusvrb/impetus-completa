/**
 * Fadiga de audiência — heurística simples por contagem de transições.
 */

let _transitions = 0;

export function noteAudienceTransition() {
  _transitions += 1;
}

export function getAudienceFatigueSnapshot() {
  return { transitions: _transitions, fatigue_risk: _transitions > 80 };
}
