/**
 * AIOI-P5.6 — Gateway READ ONLY · transporte P5.4 view-model-bundle → P5.3
 *
 * Composição exclusiva getExecutiveViewModelBundle (selecção passthrough do slice decision).
 * Proibido consumir P5.0 / P5.1 / P5.2 / P4.x diretamente.
 */

import api from '../../../services/api.js';

/**
 * @param {string} _companyId — chave de cache; tenant via auth no backend
 * @returns {Promise<object>} view model decision_visualization P5.3
 */
export async function fetchDecisionVisualizationViewModel(_companyId) {
  const { data } = await api.get('/aioi/executive-cockpit/view-model-bundle');

  if (!data?.ok) {
    return { ok: false, error: data?.error || 'Falha ao carregar view model bundle' };
  }

  const viewModel = data.decision_visualization_view_model;

  if (!viewModel) {
    return { ok: false, error: 'decision_visualization_view_model indisponível' };
  }

  return { ok: true, viewModel };
}

export default fetchDecisionVisualizationViewModel;
