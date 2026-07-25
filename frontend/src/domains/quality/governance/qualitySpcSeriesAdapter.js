/**
 * INC-033 — Adapter único SPC ↔ datasets oficiais Qualidade.
 */
import { qualityGovernance as qgApi } from '../../../services/api.js';
import {
  normalizeSpcScreenResponse,
  extractRuntimeSpcDriftMetrics,
  validateSpcRuntimeCoherence,
  SPC_EMPTY_MESSAGE
} from './qualitySpcSeriesAdapterCore.js';

export {
  normalizeSpcScreenResponse,
  extractRuntimeSpcDriftMetrics,
  validateSpcRuntimeCoherence,
  SPC_EMPTY_MESSAGE
};

/**
 * Carrega bundle de séries + executa screen SPC com subgrupos reais.
 */
export async function loadAndScreenQualitySpc() {
  const { data: seriesBundle } = await qgApi.getSpcSeries();
  if (!seriesBundle?.data_available || !Array.isArray(seriesBundle.subgroups) || !seriesBundle.subgroups.length) {
    return {
      data_available: false,
      series: seriesBundle || null,
      empty_message: seriesBundle?.empty_message || SPC_EMPTY_MESSAGE,
      reason: seriesBundle?.subgroup_meta?.reason || 'insufficient_measurements'
    };
  }

  const { data: screenRaw } = await qgApi.screenSpc({
    subgroups: seriesBundle.subgroups,
    correlation_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
  });

  const screen = normalizeSpcScreenResponse(screenRaw);
  return {
    data_available: screen.data_available,
    series: seriesBundle,
    screen,
    empty_message: screen.data_available ? null : SPC_EMPTY_MESSAGE
  };
}
