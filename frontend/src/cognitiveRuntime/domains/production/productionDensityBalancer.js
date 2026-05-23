/** Z.P0 — density governor frontend (≤6 centros, ≤8 widgets) */

const MAX_CENTERS = 6;
const MAX_WIDGETS = 8;

export function applyProductionDensity(centers = [], widgets = []) {
  return {
    centers: centers.slice(0, MAX_CENTERS),
    widgets: widgets.slice(0, MAX_WIDGETS),
    capped: centers.length > MAX_CENTERS || widgets.length > MAX_WIDGETS
  };
}

export default applyProductionDensity;
