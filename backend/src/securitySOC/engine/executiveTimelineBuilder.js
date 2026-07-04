'use strict';

/**
 * SEC-07 — Executive Timeline (consolidação SEC-01→06).
 */

function buildExecutiveTimeline(data) {
  const timeline = [];

  const add = (timestamp, phase, label, source, detail) => {
    if (!timestamp) return;
    timeline.push({ timestamp, phase, label, source, detail: detail || '' });
  };

  for (const inc of data.sec02?.incidents || []) {
    for (const phase of inc.timeline || []) {
      add(phase.timestamp, phase.phase, phase.label, 'SEC-02', inc.incidentId);
    }
  }

  for (const profile of data.sec03?.profiles || []) {
    add(profile.analyzedAt, 'THREAT_INTELLIGENCE', 'Threat Intelligence', 'SEC-03', profile.primaryAssessment);
  }

  if (data.sec04?.lastReport) {
    const r = data.sec04.lastReport;
    add(r.checkedAt, 'RUNTIME_INTEGRITY', 'Runtime Integrity', 'SEC-04', r.integrityStatus);
  }

  for (const notif of data.sec05?.notifications || []) {
    add(notif.timestamp, 'NOTIFICATION', 'Notificação', 'SEC-05', notif.title);
  }

  for (const resp of data.sec06?.history || []) {
    add(resp.createdAt, 'RESPONSE_RECOMMENDED', 'Resposta Recomendada', 'SEC-06', resp.currentMode);
  }

  add(new Date().toISOString(), 'CURRENT_STATE', 'Estado Actual', 'SEC-07', 'Snapshot consolidado');

  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

module.exports = { buildExecutiveTimeline };
