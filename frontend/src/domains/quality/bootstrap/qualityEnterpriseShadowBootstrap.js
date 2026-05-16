/**
 * WAVE 6 — shadow rollout: preload métrico do chunk operacional, sem montar rotas.
 * Ativar: VITE_IMPETUS_QUALITY_OPERATIONAL_SHADOW_MODE=true
 */
import { setQualityChunkProbeMs } from '../../../observability/qualityOperationalTelemetry.js';

function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function runQualityEnterpriseShadowBootstrap() {
  if (typeof window === 'undefined') return;
  if (!envTrue(import.meta.env.VITE_IMPETUS_QUALITY_OPERATIONAL_SHADOW_MODE)) return;

  const run = () => {
    const t0 = performance.now();
    import(/* webpackChunkName: "quality-shadow-probe" */ '../routes/qualityShadowChunkProbe.js')
      .then(() => {
        const ms = Math.round(performance.now() - t0);
        setQualityChunkProbeMs(ms);
        try {
          sessionStorage.setItem('impetus_q_shadow_chunk_ms', String(ms));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 800);
  }
}

runQualityEnterpriseShadowBootstrap();
