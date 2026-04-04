/**
 * Envia comando ao backend: IA interpreta + servidor hidrata dados reais.
 */
import { dashboard } from '../../services/api';

/**
 * @param {string} rawInput
 * @returns {Promise<object>}
 */
export async function processPanelCommand(rawInput) {
  const r = await dashboard.runPanelCommand(String(rawInput || '').trim());
  const payload = r?.data || r;
  if (!payload?.ok) {
    throw new Error(payload?.error || 'Falha no painel de comando');
  }
  return payload.output;
}
