/**
 * AIOI-P5.4 — Gateway READ ONLY para getExecutiveViewModelBundle (P5.3 transport)
 *
 * Único ponto de I/O HTTP do módulo executive-cockpit.
 * Proibido consumir P5.0 / P5.1 / P5.2 diretamente.
 */

import api from '../../../services/api.js';

/**
 * @param {string} _companyId — chave de cache no hook; tenant resolvido via auth no backend
 * @returns {Promise<object>} bundle P5.3
 */
export async function fetchExecutiveViewModelBundle(_companyId) {
  const { data } = await api.get('/aioi/executive-cockpit/view-model-bundle');
  return data;
}

export default fetchExecutiveViewModelBundle;
