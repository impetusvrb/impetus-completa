/**
 * Projeção equirretangular IMPETUS — alinhada a projectCoord() no backend.
 * x = (lon + 180) / 360 * WIDTH
 * y = (90 - lat) / 180 * HEIGHT
 */
import { geoEquirectangular, geoPath } from 'd3-geo';

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 500;

const SCALE = MAP_WIDTH / (2 * Math.PI);

/** Projeção d3 idêntica à fórmula x_pct/y_pct do backend. */
export function createImpetusProjection() {
  return geoEquirectangular()
    .scale(SCALE)
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
}

export function createImpetusPath(projection = createImpetusProjection()) {
  return geoPath(projection);
}

/** Conversão directa lon/lat → SVG (para validação cruzada com x_pct/y_pct). */
export function lonLatToSvg(lon, lat) {
  return [
    ((lon + 180) / 360) * MAP_WIDTH,
    ((90 - lat) / 180) * MAP_HEIGHT,
  ];
}

/** world_map.points → SVG (contrato certificado). */
export function pointToSvg(p) {
  return [p.x_pct * 10, p.y_pct * 5];
}
