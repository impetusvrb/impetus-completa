/**
 * Decluttering determinístico de labels — coordenada geo IMUTÁVEL.
 * LABEL_POSITION = VISUALLY ADJUSTABLE
 */

import { pointToSvg } from './worldMapProjection';

/** Offsets preset para regiões densas (Europa). */
const PRESET_OFFSETS = {
  GB: { labelDx: 18, labelDy: -34, leader: true },
  FR: { labelDx: -20, labelDy: 30, leader: true },
  DE: { labelDx: 16, labelDy: 22, leader: true },
  NL: { labelDx: 22, labelDy: 6, leader: true },
  BE: { labelDx: -18, labelDy: -10, leader: true },
  ES: { labelDx: -16, labelDy: 26, leader: true },
  IT: { labelDx: 12, labelDy: 28, leader: true },
  PL: { labelDx: 14, labelDy: -22, leader: true },
  CH: { labelDx: 8, labelDy: -18, leader: true },
  AT: { labelDx: 20, labelDy: 14, leader: true },
  SE: { labelDx: 6, labelDy: -28, leader: true },
  NO: { labelDx: -10, labelDy: -24, leader: true },
  IE: { labelDx: -22, labelDy: 8, leader: true },
  PT: { labelDx: -14, labelDy: 18, leader: true },
};

const EUROPE_BOX = { minX: 400, maxX: 580, minY: 70, maxY: 210 };
const MIN_LABEL_DIST = 38;

function isEurope(x, y) {
  return x >= EUROPE_BOX.minX && x <= EUROPE_BOX.maxX && y >= EUROPE_BOX.minY && y <= EUROPE_BOX.maxY;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * @param {Array} points world_map.points
 * @returns {Map<string, { labelDx: number, labelDy: number, leader: boolean }>}
 */
export function computeMarkerLabelLayouts(points) {
  const layouts = new Map();
  const geo = (points || []).filter((p) => p.country_code && p.country_code !== '??');
  const sorted = geo.slice().sort((a, b) => b.count - a.count);
  const placedLabels = [];

  for (const p of sorted) {
    const preset = PRESET_OFFSETS[p.country_code];
    if (preset) {
      layouts.set(p.country_code, { ...preset });
      const [x, y] = pointToSvg(p);
      placedLabels.push({ x: x + preset.labelDx, y: y + preset.labelDy });
      continue;
    }

    const [svgX, svgY] = pointToSvg(p);
    let labelDx = 0;
    let labelDy = -28;
    let leader = false;

    if (isEurope(svgX, svgY)) {
      const slots = [
        { dx: 0, dy: -32 },
        { dx: 24, dy: -12 },
        { dx: -24, dy: -12 },
        { dx: 20, dy: 22 },
        { dx: -20, dy: 22 },
        { dx: 0, dy: 30 },
        { dx: 32, dy: 8 },
        { dx: -32, dy: 8 },
      ];
      for (const slot of slots) {
        const candidate = { x: svgX + slot.dx, y: svgY + slot.dy };
        const collision = placedLabels.some((pl) => dist(pl, candidate) < MIN_LABEL_DIST);
        if (!collision) {
          labelDx = slot.dx;
          labelDy = slot.dy;
          leader = true;
          placedLabels.push(candidate);
          break;
        }
      }
      if (!leader) {
        labelDx = (sorted.indexOf(p) % 2 === 0 ? 1 : -1) * 28;
        labelDy = -20 + (sorted.indexOf(p) % 3) * 12;
        leader = true;
        placedLabels.push({ x: svgX + labelDx, y: svgY + labelDy });
      }
    } else {
      placedLabels.push({ x: svgX, y: svgY + labelDy });
    }

    layouts.set(p.country_code, { labelDx, labelDy, leader });
  }

  return layouts;
}

/** Escala visual exclusiva — NÃO altera count analítico. */
export function visualMarkerScale(count, max) {
  const ratio = Math.max(0, Math.min(1, count / Math.max(1, max)));
  return Math.sqrt(ratio);
}
