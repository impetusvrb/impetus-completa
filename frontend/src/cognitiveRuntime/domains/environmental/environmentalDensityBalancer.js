const MAX_CENTERS = 6;
const MAX_WIDGETS = 8;

export function applyEnvironmentalDensity(centers = [], widgets = []) {
  return { centers: centers.slice(0, MAX_CENTERS), widgets: widgets.slice(0, MAX_WIDGETS), capped: centers.length > MAX_CENTERS };
}

export default applyEnvironmentalDensity;
