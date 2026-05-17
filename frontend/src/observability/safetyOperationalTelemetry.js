let _navResolutionMs = [];
let _navDenied = 0;
let _menuInjected = 0;
let _publicationFailures = 0;
let _cognitivePressure = 0;
let _operationalDensity = 0;
let _rolloutReadiness = null;

export function noteSafetyNavigationResolutionMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return;
  _navResolutionMs.push(ms);
  if (_navResolutionMs.length > 200) _navResolutionMs.shift();
}

export function noteSafetyNavigationDenied(reason) {
  _navDenied += 1;
  try {
    sessionStorage.setItem('impetus_safety_nav_denied', String(_navDenied));
    if (reason) sessionStorage.setItem('impetus_safety_nav_denied_last', String(reason));
  } catch {
    /* ignore */
  }
}

export function noteSafetyMenuInjected(n) {
  if (typeof n === 'number' && n > 0) _menuInjected += n;
}

export function noteSafetyPublicationFailure() {
  _publicationFailures += 1;
}

export function noteSafetyCognitivePressure(score) {
  if (typeof score === 'number' && Number.isFinite(score)) _cognitivePressure = score;
}

export function noteSafetyOperationalDensity(score) {
  if (typeof score === 'number' && Number.isFinite(score)) _operationalDensity = score;
}

export function noteSafetyRolloutReadiness(score) {
  if (typeof score === 'number' && Number.isFinite(score)) _rolloutReadiness = score;
}

export function getSafetyOperationalTelemetrySnapshot() {
  const avgNav =
    _navResolutionMs.length > 0
      ? Math.round(_navResolutionMs.reduce((a, b) => a + b, 0) / _navResolutionMs.length)
      : null;
  return {
    safety_navigation_runtime_ms: avgNav,
    safety_navigation_resolution_samples: _navResolutionMs.length,
    safety_navigation_denied_total: _navDenied,
    safety_menu_injected_total: _menuInjected,
    safety_publication_failures_total: _publicationFailures,
    safety_cognitive_pressure: _cognitivePressure,
    safety_operational_density: _operationalDensity,
    safety_rollout_readiness_score: _rolloutReadiness
  };
}
