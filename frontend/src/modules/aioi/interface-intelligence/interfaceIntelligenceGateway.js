/**
 * AIOI-P5.7 — Gateway READ ONLY · transporte P5.4 view-model-bundle → P5.3
 *
 * Composição exclusiva interface_intelligence_view_model (passthrough).
 * Proibido consumir P5.0 / P5.1 / P5.2 / P4.x diretamente.
 */

import api from '../../../services/api.js';

/**
 * @param {string} _companyId — chave de cache; tenant via auth no backend
 * @returns {Promise<object>} view model interface_intelligence P5.3
 */
export async function fetchInterfaceIntelligenceViewModel(_companyId) {
  const { data } = await api.get('/aioi/executive-cockpit/view-model-bundle');

  if (!data?.ok) {
    return { ok: false, error: data?.error || 'Falha ao carregar view model bundle' };
  }

  const viewModel = data.interface_intelligence_view_model;

  if (!viewModel) {
    return { ok: false, error: 'interface_intelligence_view_model indisponível' };
  }

  return { ok: true, viewModel };
}

export default fetchInterfaceIntelligenceViewModel;
