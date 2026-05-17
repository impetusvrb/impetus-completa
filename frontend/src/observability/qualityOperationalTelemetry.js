/**
 * Telemetria operacional qualidade — aditiva, sem alterar observability core WAVE2.
 * Métricas em memória + sessionStorage opcional (pilotos / shadow).
 */

let _unifiedReconnects = 0;
let _attachmentAttempts = 0;
let _attachmentFailures = 0;
let _scannerErrors = 0;
let _chunkProbeMs = null;
let _qualityNavResolutionMs = [];
let _qualityNavDenied = 0;
let _qualityMenuInjected = 0;
let _qualityRouteResolutionMs = [];
let _qualityLazyChunkMs = [];
let _qualityPublicationShadow = 0;
let _qualityPublicationFailures = 0;

export function noteQualityUnifiedReconnect() {
  _unifiedReconnects += 1;
  try {
    sessionStorage.setItem('impetus_q_reconnects', String(_unifiedReconnects));
  } catch {
    /* ignore */
  }
}

export function noteQualityAttachmentAttempt() {
  _attachmentAttempts += 1;
}

export function noteQualityAttachmentFailure() {
  _attachmentFailures += 1;
}

export function noteQualityScannerError() {
  _scannerErrors += 1;
}

export function setQualityChunkProbeMs(ms) {
  _chunkProbeMs = typeof ms === 'number' ? ms : null;
}

export function noteQualityNavigationResolutionMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return;
  _qualityNavResolutionMs.push(ms);
  if (_qualityNavResolutionMs.length > 200) _qualityNavResolutionMs.shift();
}

export function noteQualityNavigationDenied(reason) {
  _qualityNavDenied += 1;
  try {
    sessionStorage.setItem('impetus_q_nav_denied', String(_qualityNavDenied));
    if (reason) sessionStorage.setItem('impetus_q_nav_denied_last', String(reason));
  } catch {
    /* ignore */
  }
}

export function noteQualityMenuInjected(n) {
  if (typeof n === 'number' && n > 0) _qualityMenuInjected += n;
}

export function noteQualityRouteResolutionMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return;
  _qualityRouteResolutionMs.push(ms);
  if (_qualityRouteResolutionMs.length > 200) _qualityRouteResolutionMs.shift();
}

export function noteQualityLazyChunkMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return;
  _qualityLazyChunkMs.push(ms);
  if (_qualityLazyChunkMs.length > 200) _qualityLazyChunkMs.shift();
}

export function noteQualityPublicationShadowEvent() {
  _qualityPublicationShadow += 1;
}

export function noteQualityPublicationFailure() {
  _qualityPublicationFailures += 1;
}

export function getQualityOperationalTelemetrySnapshot() {
  return {
    unified_reconnect_count: _unifiedReconnects,
    attachment_attempts: _attachmentAttempts,
    attachment_failures: _attachmentFailures,
    scanner_errors: _scannerErrors,
    shadow_chunk_probe_ms: _chunkProbeMs,
    quality_navigation_resolution_samples: _qualityNavResolutionMs.length,
    quality_navigation_denied_total: _qualityNavDenied,
    quality_menu_injected_total: _qualityMenuInjected,
    quality_route_resolution_samples: _qualityRouteResolutionMs.length,
    quality_lazy_chunk_samples: _qualityLazyChunkMs.length,
    quality_publication_shadow_total: _qualityPublicationShadow,
    quality_publication_failures_total: _qualityPublicationFailures
  };
}
