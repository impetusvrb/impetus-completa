'use strict';

/**
 * SEC-17 — Exfiltration Timeline Builder.
 * Linha temporal forense: reconhecimento → enumeração → acesso → movimentação → encerramento.
 */

const store = require('../store/exfiltrationStore');

const PHASES = Object.freeze([
  'reconnaissance',
  'enumeration',
  'access',
  'movement',
  'closure'
]);

function classifyPhase(incident, movementProfile) {
  const cls = incident.classification || '';
  const types = movementProfile?.movementTypes || [];

  if (types.includes('mass_download') || types.includes('chained_downloads')) return 'movement';
  if (cls.includes('ENUM') || cls.includes('PROBE') || cls.includes('PATH')) return 'enumeration';
  if (cls.includes('RECON') || cls.includes('SCAN')) return 'reconnaissance';
  if (incident.status === 'CLOSED') return 'closure';
  if (types.includes('repetitive_read') || types.includes('automated_scraping')) return 'access';
  return 'access';
}

function buildTimeline(incidents, movementProfiles, accessProfiles) {
  const movById = new Map(movementProfiles.map((p) => [p.incidentId, p]));
  const accById = new Map(accessProfiles.map((p) => [p.incidentId, p]));
  const events = [];

  for (const inc of incidents || []) {
    const mov = movById.get(inc.incidentId);
    const acc = accById.get(inc.incidentId);
    const phase = classifyPhase(inc, mov);

    events.push({
      ts: inc.firstSeen || inc.lastSeen,
      phase,
      phaseLabel: PHASES.includes(phase) ? phase : 'access',
      incidentId: inc.incidentId,
      classification: inc.classification,
      severity: inc.severity,
      requestCount: inc.metrics?.requestCount || 0,
      assetsAccessed: (acc?.assetsAccessed || []).map((a) => a.assetId),
      movementTypes: mov?.movementTypes || []
    });

    if (inc.lastSeen && inc.lastSeen !== inc.firstSeen) {
      events.push({
        ts: inc.lastSeen,
        phase: inc.status === 'CLOSED' ? 'closure' : 'movement',
        phaseLabel: inc.status === 'CLOSED' ? 'closure' : 'movement',
        incidentId: inc.incidentId,
        classification: inc.classification,
        severity: inc.severity,
        requestCount: inc.metrics?.requestCount || 0,
        assetsAccessed: (acc?.assetsAccessed || []).map((a) => a.assetId),
        movementTypes: mov?.movementTypes || []
      });
    }
  }

  const sorted = events.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  const summary = {
    reconnaissance: sorted.filter((e) => e.phase === 'reconnaissance').length,
    enumeration: sorted.filter((e) => e.phase === 'enumeration').length,
    access: sorted.filter((e) => e.phase === 'access').length,
    movement: sorted.filter((e) => e.phase === 'movement').length,
    closure: sorted.filter((e) => e.phase === 'closure').length
  };

  store.setTimeline(sorted);
  return { events: sorted.slice(0, 50), summary, phases: PHASES };
}

module.exports = { PHASES, classifyPhase, buildTimeline };
