/**
 * Telemetria operacional qualidade — aditiva, sem alterar observability core WAVE2.
 * Métricas em memória + sessionStorage opcional (pilotos / shadow).
 */

let _unifiedReconnects = 0;
let _attachmentAttempts = 0;
let _attachmentFailures = 0;
let _scannerErrors = 0;
let _chunkProbeMs = null;

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

export function getQualityOperationalTelemetrySnapshot() {
  return {
    unified_reconnect_count: _unifiedReconnects,
    attachment_attempts: _attachmentAttempts,
    attachment_failures: _attachmentFailures,
    scanner_errors: _scannerErrors,
    shadow_chunk_probe_ms: _chunkProbeMs
  };
}
