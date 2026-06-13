/**
 * AIOI-P5.8 — Gateway READ ONLY · transporte P5.4 view-model-bundle (bundle completo P5.3)
 *
 * Proibido novos endpoints, P5.0 / P5.1 / P5.2 / P4.x direto.
 */

import api from '../../../services/api.js';

/**
 * @param {string} _companyId — chave de cache; tenant via auth no backend
 * @returns {Promise<object>} bundle P5.3 completo
 */
export async function fetchExecutiveReportsBundle(_companyId) {
  const { data } = await api.get('/aioi/executive-cockpit/view-model-bundle');

  if (!data?.ok) {
    return { ok: false, error: data?.error || 'Falha ao carregar view model bundle' };
  }

  if (
    !data.executive_summary_view_model ||
    !data.strategic_overview_view_model ||
    !data.decision_visualization_view_model ||
    !data.interface_intelligence_view_model
  ) {
    return { ok: false, error: 'view model bundle incompleto' };
  }

  return {
    ok: true,
    bundle: {
      executive_summary_view_model: data.executive_summary_view_model,
      strategic_overview_view_model: data.strategic_overview_view_model,
      decision_visualization_view_model: data.decision_visualization_view_model,
      interface_intelligence_view_model: data.interface_intelligence_view_model
    }
  };
}

export default fetchExecutiveReportsBundle;
