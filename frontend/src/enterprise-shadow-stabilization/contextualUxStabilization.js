/**
 * UX contextual assistivo — recomendações sem alterar design global.
 */
import { validateEnterpriseContextualUx } from '../runtime-validation/enterpriseContextualUxValidator.js';

export function recommendUxStabilization(band, menuCount, viewCount = 2) {
  const ux = validateEnterpriseContextualUx({
    band,
    menu_item_count: menuCount,
    view_count: viewCount,
    abandonment_rate: 0.1
  });
  const actions = [];
  if (ux.ux_pressure_class === 'HIGH' || ux.ux_pressure_class === 'CRITICAL') {
    actions.push('reduce_visible_menu_items');
    actions.push('prefer_linear_operational_flow');
  }
  if (band === 'operator' || band === 'production') {
    actions.push('rf_first_single_panel');
  }
  return {
    assistive_only: true,
    auto_apply: false,
    ux_pressure: ux.ux_pressure_class,
    actions,
    data_density_attr: ux.ux_pressure_class === 'CRITICAL' ? 'compact' : undefined
  };
}
