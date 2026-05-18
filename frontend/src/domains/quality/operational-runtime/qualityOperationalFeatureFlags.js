/**
 * Flags Vite — runtime operacional qualidade (default false; rollback = false).
 * Novos nomes enterprise: REALTIME_ENABLED / KIOSK_ENABLED (compatível com nomes anteriores).
 */
function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isQualityOperationalRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED);
}

export function isQualityOfflineRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_OFFLINE_RUNTIME_ENABLED);
}

export function isQualityScannerRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_SCANNER_RUNTIME_ENABLED);
}

/** Realtime collection — VITE_IMPETUS_QUALITY_REALTIME_ENABLED ou flag legacy. */
export function isQualityRealtimeCollectionEnabled() {
  return (
    envTrue(import.meta.env.VITE_IMPETUS_QUALITY_REALTIME_ENABLED) ||
    envTrue(import.meta.env.VITE_IMPETUS_QUALITY_REALTIME_COLLECTION_ENABLED)
  );
}

/** Kiosk — VITE_IMPETUS_QUALITY_KIOSK_ENABLED ou flag legacy. */
export function isQualityKioskRuntimeEnabled() {
  return (
    envTrue(import.meta.env.VITE_IMPETUS_QUALITY_KIOSK_ENABLED) ||
    envTrue(import.meta.env.VITE_IMPETUS_QUALITY_KIOSK_RUNTIME_ENABLED)
  );
}

/** Shadow rollout: preload chunk + métricas passivas (não expõe UI). */
export function isQualityOperationalShadowMode() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_OPERATIONAL_SHADOW_MODE);
}

/** Painel diagnostics / saúde de fila (pilotagem). */
export function isQualityOperationalDiagnosticsEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_OPERATIONAL_DIAGNOSTICS);
}

export function isQualityAttachmentRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_ATTACHMENT_RUNTIME_ENABLED);
}

export function isUltraLowBandwidthMode() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_ULTRA_LOW_BANDWIDTH);
}

export function getOperationalRuntimeSnapshot() {
  return {
    operational: isQualityOperationalRuntimeEnabled(),
    offline: isQualityOfflineRuntimeEnabled(),
    scanner: isQualityScannerRuntimeEnabled(),
    realtime: isQualityRealtimeCollectionEnabled(),
    kiosk: isQualityKioskRuntimeEnabled(),
    attachment: isQualityAttachmentRuntimeEnabled(),
    lowBandwidth: isUltraLowBandwidthMode(),
    shadow: isQualityOperationalShadowMode(),
    diagnostics: isQualityOperationalDiagnosticsEnabled()
  };
}
