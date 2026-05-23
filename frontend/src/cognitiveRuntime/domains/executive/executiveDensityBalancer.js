export function applyExecutiveDensity(centers = [], widgets = []) {
  const maxCenters = 5;
  const maxWidgets = 7;
  return {
    centers: centers.slice(0, maxCenters),
    widgets: widgets.slice(0, maxWidgets),
    density_safe: centers.length <= maxCenters && widgets.length <= maxWidgets
  };
}

export default applyExecutiveDensity;
