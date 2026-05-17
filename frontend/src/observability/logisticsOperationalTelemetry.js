let _navResolutionMs = [];
let _navDenied = 0;
let _menuInjected = 0;
let _publicationFailures = 0;
let _cognitivePressure = 0;
let _rolloutReadiness = null;

export function noteLogisticsNavigationResolutionMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return;
  _navResolutionMs.push(ms);
  if (_navResolutionMs.length > 200) _navResolutionMs.shift();
}

export function noteLogisticsNavigationDenied(reason) {
  _navDenied += 1;
  try {
    sessionStorage.setItem('impetus_logistics_nav_denied', String(_navDenied));
    if (reason) sessionStorage.setItem('impetus_logistics_nav_denied_last', String(reason));
  } catch {
    /* ignore */
  }
}

export function noteLogisticsMenuInjected(n) {
  if (typeof n === 'number' && n > 0) _menuInjected += n;
}

export function noteLogisticsPublicationFailure() {
  _publicationFailures += 1;
}

export function noteLogisticsCognitivePressure(score) {
  if (typeof score === 'number' && Number.isFinite(score)) _cognitivePressure = score;
}

export function noteLogisticsRolloutReadiness(score) {
  if (typeof score === 'number' && Number.isFinite(score)) _rolloutReadiness = score;
}

export function getLogisticsOperationalTelemetrySnapshot() {
  const avgNav =
    _navResolutionMs.length > 0
      ? Math.round(_navResolutionMs.reduce((a, b) => a + b, 0) / _navResolutionMs.length)
      : null;
  return {
    logistics_navigation_runtime_ms: avgNav,
    logistics_navigation_denied_total: _navDenied,
    logistics_menu_injected_total: _menuInjected,
    logistics_publication_failures_total: _publicationFailures,
    logistics_cognitive_pressure: _cognitivePressure,
    logistics_rollout_readiness_score: _rolloutReadiness
  };
}
