'use strict';

function inferTemporal(now = new Date()) {
  const hour = now.getHours();
  const dow = now.getDay();
  const business_hours = hour >= 7 && hour < 19;
  const weekend = dow === 0 || dow === 6;
  const part_of_day =
    hour < 6 ? 'madrugada' : hour < 12 ? 'manha' : hour < 18 ? 'tarde' : 'noite';
  return {
    iso: now.toISOString(),
    hour,
    part_of_day,
    business_hours,
    weekend,
    weekday: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][dow]
  };
}

module.exports = { inferTemporal };
