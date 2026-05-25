'use strict';

function extractTemporal(text = '') {
  const t = String(text).toLowerCase();
  const markers = [];
  if (/amanh/i.test(t)) markers.push({ type: 'tomorrow', raw: 'amanhã' });
  if (/\bhoje\b/i.test(t)) markers.push({ type: 'today', raw: 'hoje' });
  const time = t.match(/(\d{1,2})\s*h(?:oras?)?|(\d{1,2}):(\d{2})/);
  if (time) {
    const hour = time[1] ? parseInt(time[1], 10) : parseInt(time[2], 10);
    const min = time[3] ? parseInt(time[3], 10) : 0;
    markers.push({ type: 'clock', raw: `${hour}:${String(min).padStart(2, '0')}`, hour, minute: min });
  }
  const weekdays = ['segunda', 'terça', 'quarta', 'quinta', 'sexta'];
  for (const d of weekdays) {
    if (t.includes(d)) markers.push({ type: 'weekday', raw: d });
  }
  return { temporal_markers: markers, has_deadline: markers.length > 0 };
}

module.exports = { extractTemporal };
