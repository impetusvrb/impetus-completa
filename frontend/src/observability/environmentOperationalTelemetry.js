let _navResolutionMs = [];
let _navDenied = 0;
let _menuInjected = 0;
let _publicationFailures = 0;
let _cognitivePressure = 0;
let _rolloutReadiness = null;

export function noteEnvironmentNavigationResolutionMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return;
  _navResolutionMs.push(ms);
  if (_navResolutionMs.length > 200) _navResolutionMs.shift();
}

export function noteEnvironmentNavigationDenied(reason) {
  _navDenied += 1;
  try {
    sessionStorage.setItem('impetus_environment_nav_denied', String(_navDenied));
    if (reason) sessionStorage.setItem('impetus_environment_nav_denied_last', String(reason));
  } catch {
    /* ignore */
  }
}

export function noteEnvironmentMenuInjected(n) {
  if (typeof n === 'number' && n > 0) _menuInjected += n;
}

export function noteEnvironmentPublicationFailure() {
  _publicationFailures += 1;
}

export function noteEnvironmentCognitivePressure(score) {
  if (typeof score === 'number' && Number.isFinite(score)) _cognitivePressure = score;
}

export function noteEnvironmentRolloutReadiness(score) {
  if (typeof score === 'number' && Number.isFinite(score)) _rolloutReadiness = score;
}

export function getEnvironmentOperationalTelemetrySnapshot() {
  const avgNav =
    _navResolutionMs.length > 0
      ? Math.round(_navResolutionMs.reduce((a, b) => a + b, 0) / _navResolutionMs.length)
      : null;
  return {
    environment_navigation_runtime_ms: avgNav,
    environment_navigation_denied_total: _navDenied,
    environment_menu_injected_total: _menuInjected,
    environment_publication_failures_total: _publicationFailures,
    environment_cognitive_pressure: _cognitivePressure,
    environment_rollout_readiness_score: _rolloutReadiness
  };
}
