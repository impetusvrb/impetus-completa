/**
 * Métricas temporárias de boot do Dashboard — comparativo antes/depois (Fase 1).
 */
const BOOT_WINDOW_MS = 45_000;
const bootStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

let currentConcurrent = 0;
let peakConcurrent = 0;
let requestCount = 0;
let dashboardMeMs = null;
let wave1ReadyMs = null;
let wave2Ms = null;
let wave3Ms = null;
let errors503 = 0;

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function inBootWindow() {
  return nowMs() - bootStart < BOOT_WINDOW_MS;
}

export function trackBootRequestStart() {
  if (!inBootWindow()) return;
  currentConcurrent += 1;
  requestCount += 1;
  if (currentConcurrent > peakConcurrent) peakConcurrent = currentConcurrent;
}

export function trackBootRequestEnd(status) {
  if (!inBootWindow()) return;
  currentConcurrent = Math.max(0, currentConcurrent - 1);
  if (status === 503) errors503 += 1;
}

export function markDashboardMeMs(ms) {
  if (dashboardMeMs == null) dashboardMeMs = ms;
}

export function markWaveReady(wave) {
  const elapsed = Math.round(nowMs() - bootStart);
  if (wave === 1 && wave1ReadyMs == null) wave1ReadyMs = elapsed;
  if (wave === 2 && wave2Ms == null) wave2Ms = elapsed;
  if (wave === 3 && wave3Ms == null) wave3Ms = elapsed;
}

export function getDashboardBootMetrics() {
  return {
    boot_elapsed_ms: Math.round(nowMs() - bootStart),
    peak_concurrent_requests: peakConcurrent,
    boot_request_count: requestCount,
    dashboard_me_ms: dashboardMeMs,
    wave1_ready_ms: wave1ReadyMs,
    wave2_ready_ms: wave2Ms,
    wave3_ready_ms: wave3Ms,
    http_503_during_boot: errors503
  };
}

export function exposeBootMetricsGlobally() {
  if (typeof window !== 'undefined') {
    window.__IMPETUS_BOOT_METRICS__ = getDashboardBootMetrics;
  }
}

exposeBootMetricsGlobally();
