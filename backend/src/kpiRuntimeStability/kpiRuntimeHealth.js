'use strict';

function assessKpiRuntimeHealth(pack = {}) {
  const stable = pack.visibility?.visibility_stable !== false;
  const cockpit = pack.dashboard?.cockpit?.cockpit_operational !== false;
  const targeting =
    pack.targeting?.cross_domain?.valid !== false &&
    pack.targeting?.authority?.consistent !== false;
  const score = (stable ? 0.3 : 0) + (cockpit ? 0.35 : 0) + (targeting ? 0.35 : 0);
  return {
    health_score: Number(Math.min(1, score).toFixed(4)),
    stable,
    cockpit_ok: cockpit,
    targeting_ok: targeting
  };
}

module.exports = { assessKpiRuntimeHealth };
