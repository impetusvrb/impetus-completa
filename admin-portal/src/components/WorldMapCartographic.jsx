/**
 * WorldMapCartographic — SEC-VISUAL-INTELLIGENCE-003B-R5
 *
 * Geometria: TopoJSON local (world-atlas countries-110m)
 * Projeção: equirretangular d3-geo alinhada ao backend (x_pct/y_pct)
 * ZOOM_IS_VISUAL_ONLY — transform SVG local, zero backend
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import countries110m from 'world-atlas/countries-110m.json';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  createImpetusPath,
  createImpetusProjection,
  pointToSvg,
} from '../utils/worldMapProjection';
import {
  computeMarkerLabelLayouts,
  visualMarkerScale,
} from '../utils/markerLabelLayout';

const ANIM_STYLE_ID = 'impetus-map-anim-003b-r8b';
const ANIM_CSS = `
@keyframes imap-pulse1 {
  0%   { r: 6;  opacity: 0.55; }
  100% { r: 26; opacity: 0;    }
}
@keyframes imap-pulse2 {
  0%   { r: 9;  opacity: 0.32; }
  100% { r: 36; opacity: 0;    }
}
.imap-p1 { animation: imap-pulse1 2.4s ease-out infinite; }
.imap-p2 { animation: imap-pulse2 3.0s ease-out infinite 0.65s; }
`;

/* R8B: recalibração da câmera para o palco MAP-FIRST expandido.
 * y=10 → lat≈86°N: respiração oceânica acima da Rússia (era y=35 → 77°N)
 * height=415 → base y=425 → lat≈-62°S: reduz dominância da Antártida */
const SOC_VIEWBOX = '0 10 1000 415';

/* ID numérico TopoJSON da Antártida (world-atlas countries-110m, ISO M49:010) */
const ANTARCTICA_ID = 10;

const GRID_LONS = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const GRID_LATS = [-60, -30, 0, 30, 60];

const MIN_ZOOM = 0.85;
const MAX_ZOOM = 4;

/** Intensidade = volume relativo — NÃO risco nacional. */
function markerColor(intensity, isSelected) {
  if (isSelected) return '#00d4ff';
  if (intensity > 0.65) return '#ff4040';
  if (intensity > 0.35) return '#ff8800';
  if (intensity > 0.12) return '#b44dff';
  return '#00d4ff';
}

function markerTierLabel(intensity) {
  if (intensity > 0.65) return 'Muito alto';
  if (intensity > 0.35) return 'Alto';
  if (intensity > 0.12) return 'Médio';
  if (intensity > 0) return 'Baixo';
  return 'Mínimo';
}

function lonToX(lon) {
  return ((lon + 180) / 360) * MAP_WIDTH;
}
function latToY(lat) {
  return ((90 - lat) / 180) * MAP_HEIGHT;
}

function TerritoryMarker({
  p, max, isSelected, onSelect, onHover, onLeave, labelLayout, isSoc,
}) {
  const intensity = p.count / max;
  const vis = visualMarkerScale(p.count, max);
  const color = markerColor(intensity, isSelected);
  const coreR = isSoc ? (7 + vis * 9) : (5 + vis * 7);
  const showRichLabel = p.count >= 1;
  const layout = labelLayout || { labelDx: 0, labelDy: -(coreR + 20), leader: false };
  const { labelDx, labelDy, leader } = layout;

  /* R8B — hierarquia perceptiva contínua baseada em vis */
  const atmosphereR   = coreR + (isSoc ? 18 : 10);
  const atmosphereR2  = atmosphereR + 10;
  const atmosphereR3  = atmosphereR + 24;
  const ringR1        = coreR + (isSoc ? 6 : 4);
  const ringR2        = coreR + (isSoc ? 14 : 9);

  /* Opacidades escalonadas por tier */
  const atm1Opacity = 0.08 + vis * 0.12;           /* LOW: 0.08 → VERY HIGH: 0.20 */
  const atm2Opacity = vis > 0.35 ? (0.04 + (vis - 0.35) * 0.12) : 0; /* MEDIUM+ */
  const atm3Opacity = vis > 0.65 ? (vis - 0.65) * 0.09 : 0;           /* HIGH+   */
  const ring1Opacity = 0.28 + vis * 0.30;
  const ring2Opacity = vis > 0.4 ? (vis - 0.4) * 0.28 : 0;

  /* Count font size proporcional: legibilidade imediata nos dominantes */
  const countFontSize = isSoc ? Math.round(11 + vis * 6) : Math.round(9 + vis * 4);

  return (
    <g
      transform={`translate(${p._svgX},${p._svgY})`}
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(p)}
      onMouseEnter={() => onHover({ svgX: p._svgX, svgY: p._svgY, p, intensity })}
      onMouseLeave={onLeave}
      onFocus={() => onHover({ svgX: p._svgX, svgY: p._svgY, p, intensity })}
      onBlur={onLeave}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(p);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${p.country || p.country_code}: ${p.count} eventos ponderados observados. Clique para investigar.`}
      aria-pressed={isSelected}
    >
      {/* L3 — bloom distante para HIGH/VERY HIGH */}
      {atm3Opacity > 0 && (
        <circle r={atmosphereR3} cx={0} cy={0} fill={color} opacity={atm3Opacity} />
      )}
      {/* L4 — halo atmosférico secundário (MEDIUM+) */}
      {atm2Opacity > 0 && (
        <circle r={atmosphereR2} cx={0} cy={0} fill={color} opacity={atm2Opacity} />
      )}
      {/* L5 — atmosfera primária */}
      <circle r={atmosphereR} cx={0} cy={0} fill={color} opacity={atm1Opacity} />

      {/* L6 — rings estáticos duplos */}
      <circle r={ringR1} cx={0} cy={0} fill="none" stroke={color} strokeWidth="0.55" opacity={ring1Opacity} />
      {ring2Opacity > 0 && (
        <circle r={ringR2} cx={0} cy={0} fill="none" stroke={color} strokeWidth="0.4" opacity={ring2Opacity} />
      )}
      {/* L6b — pulse rings animados */}
      <circle className="imap-p2" r={coreR} cx={0} cy={0} fill="none" stroke={color} strokeWidth="0.65" opacity="0" />
      <circle className="imap-p1" r={coreR} cx={0} cy={0} fill="none" stroke={color} strokeWidth="1.0" opacity="0" />

      {/* L7 — core radial */}
      <circle
        r={coreR}
        cx={0}
        cy={0}
        fill={`url(#marker-core-${p.country_code})`}
        stroke={isSelected ? '#fff' : color}
        strokeWidth={isSelected ? 1.8 : 1.1}
        opacity={isSelected ? 1 : 0.93}
      />

      {/* L8 — hierarquia de labels: COUNT > ISO > country */}
      {showRichLabel && (
        <g transform={`translate(${labelDx},${labelDy})`}>
          {leader && (
            <line
              x1={-labelDx}
              y1={-labelDy}
              x2={0}
              y2={0}
              stroke={color}
              strokeWidth="0.5"
              opacity="0.38"
            />
          )}
          {/* COUNT — primário: branco, maior, halo forte */}
          <text
            x={0}
            y={-10}
            textAnchor="middle"
            fontSize={countFontSize}
            fill="#ffffff"
            fontFamily="'Share Tech Mono', monospace"
            fontWeight="700"
            stroke="#010408"
            strokeWidth="3"
            paintOrder="stroke"
          >
            {p.count}
          </text>
          {/* ISO — secundário: cor do marker, menor */}
          <text
            x={0}
            y={2}
            textAnchor="middle"
            fontSize={isSoc ? 8.5 : 7}
            fill={color}
            fontFamily="'Share Tech Mono', monospace"
            fontWeight="600"
            opacity="0.90"
          >
            {p.country_code}
          </text>
          {/* country name — terciário: muito discreto */}
          {p.country && p.country !== p.country_code && (
            <text
              x={0}
              y={isSoc ? 13 : 11}
              textAnchor="middle"
              fontSize={isSoc ? 7 : 6}
              fill="rgba(180,210,235,0.52)"
              fontFamily="'Rajdhani', sans-serif"
              fontWeight="600"
            >
              {(p.country || '').slice(0, 16)}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

export default function WorldMapCartographic({
  points,
  onSelectCountry,
  selectedCode,
  variant = 'default',
}) {
  const isSoc = variant === 'soc';
  const [tooltip, setTooltip] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const viewportRef = useRef(null);

  const { countryPaths, antarcticaPath } = useMemo(() => {
    const projection = createImpetusProjection();
    const pathGen = createImpetusPath(projection);
    const collection = feature(countries110m, countries110m.objects.countries);
    const all = collection.features
      .map((f) => ({ id: f.id, d: pathGen(f) }))
      .filter((f) => f.d);
    /* Separar Antártida: ISO M49 = 10 */
    /* eslint-disable eqeqeq */
    const antarcticaPath = all.find((f) => f.id == ANTARCTICA_ID) || null;
    const countryPaths   = all.filter((f) => f.id != ANTARCTICA_ID);
    /* eslint-enable eqeqeq */
    return { countryPaths, antarcticaPath };
  }, []);

  useEffect(() => {
    if (!document.getElementById(ANIM_STYLE_ID)) {
      const el = document.createElement('style');
      el.id = ANIM_STYLE_ID;
      el.textContent = ANIM_CSS;
      document.head.appendChild(el);
    }
  }, []);

  const pts = Array.isArray(points) ? points : [];
  const max = Math.max(1, ...pts.map((p) => p.count));
  const geoPoints = pts.filter((p) => p.country_code !== '??');
  const unknownPoint = pts.find((p) => p.country_code === '??');

  const labelLayouts = useMemo(
    () => computeMarkerLabelLayouts(geoPoints),
    [geoPoints]
  );

  const geoPointsWithSvg = useMemo(
    () => geoPoints.map((p) => {
      const [svgX, svgY] = pointToSvg(p);
      return { ...p, _svgX: svgX, _svgY: svgY };
    }),
    [geoPoints]
  );

  const handleSelect = useCallback((p) => {
    if (typeof onSelectCountry === 'function') {
      onSelectCountry({ key: p.country_code, label: p.country || p.country_code });
    }
  }, [onSelectCountry]);

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25));
  const zoomFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * delta)));
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const cx = MAP_WIDTH / 2;
  const cy = MAP_HEIGHT / 2;
  const mapTransform = `translate(${cx + pan.x},${cy + pan.y}) scale(${zoom}) translate(${-cx},${-cy})`;

  const mapContent = pts.length === 0 ? (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>
      Sem geolocalização disponível.
    </p>
  ) : (
    <>
      <div
        ref={viewportRef}
        className={isSoc ? 'soc-map-viewport' : undefined}
        style={isSoc ? undefined : {
          position: 'relative',
          width: '100%',
          aspectRatio: '2 / 1',
          minHeight: 280,
          border: '1px solid rgba(0,212,255,0.18)',
          borderRadius: 4,
          overflow: 'hidden',
          background: '#040810',
          boxShadow: 'inset 0 0 80px rgba(0,40,80,0.35)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {isSoc && (
          <div className="soc-map-zoom-controls" aria-label="Controles de zoom">
            <button type="button" className="soc-map-zoom-btn" onClick={zoomIn} aria-label="Aumentar zoom">+</button>
            <button type="button" className="soc-map-zoom-btn" onClick={zoomOut} aria-label="Diminuir zoom">−</button>
            <button type="button" className="soc-map-zoom-btn" onClick={zoomFit} aria-label="Ajustar mapa" title="Fit">⌂</button>
          </div>
        )}

        <svg
          viewBox={isSoc ? SOC_VIEWBOX : `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', width: '100%', height: '100%' }}
          aria-label="Mapa mundial de origem de eventos de segurança"
          role="img"
        >
          <defs>
            {/* R8B — oceano profundo: gradiente multi-stop para DEEP DIGITAL SPACE */}
            <radialGradient id="ocean-vignette" cx="50%" cy="40%" r="72%">
              <stop offset="0%"   stopColor={isSoc ? '#0d2038' : '#091828'} />
              <stop offset="28%"  stopColor={isSoc ? '#091528' : '#060f1c'} />
              <stop offset="58%"  stopColor={isSoc ? '#050d1a' : '#040910'} />
              <stop offset="85%"  stopColor="#030710" />
              <stop offset="100%" stopColor="#010408" />
            </radialGradient>
            {/* Vignette periférica adicional — escurece as bordas do oceano */}
            <radialGradient id="ocean-peripheral" cx="50%" cy="50%" r="55%">
              <stop offset="0%"   stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(1,3,8,0.55)" />
            </radialGradient>
            <pattern id="dot-grid" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="6" r={isSoc ? 0.55 : 0.45} fill={isSoc ? 'rgba(0,190,255,0.10)' : 'rgba(0,180,255,0.07)'} />
            </pattern>
            <filter id="land-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={isSoc ? '1.8' : '0.8'} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {geoPoints.map((p) => {
              const intensity = p.count / max;
              const color = markerColor(intensity, selectedCode === p.country_code);
              return (
                <radialGradient key={p.country_code} id={`marker-core-${p.country_code}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="#ffffff"  stopOpacity="0.98" />
                  <stop offset="25%"  stopColor={color}    stopOpacity="0.97" />
                  <stop offset="70%"  stopColor={color}    stopOpacity="0.88" />
                  <stop offset="100%" stopColor={color}    stopOpacity="0.72" />
                </radialGradient>
              );
            })}
          </defs>

          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#ocean-vignette)" />
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#dot-grid)" />
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#ocean-peripheral)" />

          <g transform={mapTransform}>
            {GRID_LONS.map((lon) => (
              <line key={`gl-${lon}`} x1={lonToX(lon)} y1={0} x2={lonToX(lon)} y2={MAP_HEIGHT}
                stroke={isSoc ? 'rgba(0,180,255,0.06)' : 'rgba(0,180,255,0.04)'} strokeWidth="0.5" />
            ))}
            {GRID_LATS.map((lat) => (
              <line key={`lat-${lat}`} x1={0} y1={latToY(lat)} x2={MAP_WIDTH} y2={latToY(lat)}
                stroke={isSoc ? 'rgba(0,180,255,0.06)' : 'rgba(0,180,255,0.04)'} strokeWidth="0.5" />
            ))}
            <line x1={0} y1={MAP_HEIGHT / 2} x2={MAP_WIDTH} y2={MAP_HEIGHT / 2}
              stroke="rgba(0,212,255,0.12)" strokeWidth="0.7" />

            {/* R8B — territórios: mais luminosos que o oceano para separação cromática */}
            <g filter="url(#land-glow)">
              {countryPaths.map((c) => (
                <path
                  key={c.id}
                  d={c.d}
                  fill={isSoc ? '#112844' : '#0a1830'}
                  stroke={isSoc ? 'rgba(0,212,255,0.38)' : 'rgba(0,200,255,0.22)'}
                  strokeWidth={isSoc ? '0.55' : '0.35'}
                  strokeLinejoin="round"
                />
              ))}
            </g>
            {/* R8B — Antártida: fill mais escuro e costeira muito discreta */}
            {antarcticaPath && (
              <path
                d={antarcticaPath.d}
                fill={isSoc ? '#0a1a2c' : '#080f1e'}
                stroke={isSoc ? 'rgba(0,160,220,0.15)' : 'rgba(0,160,220,0.10)'}
                strokeWidth="0.35"
                strokeLinejoin="round"
              />
            )}

            {geoPointsWithSvg.map((p) => (
              <TerritoryMarker
                key={p.country_code}
                p={p}
                max={max}
                isSelected={selectedCode === p.country_code}
                onSelect={handleSelect}
                onHover={setTooltip}
                onLeave={() => setTooltip(null)}
                labelLayout={labelLayouts.get(p.country_code)}
                isSoc={isSoc}
              />
            ))}
          </g>

          {tooltip && (() => {
            const { svgX: tx, svgY: ty, p, intensity } = tooltip;
            const boxW = 190;
            const boxH = 58;
            const bx = tx + 16 > MAP_WIDTH - boxW ? tx - boxW - 16 : tx + 16;
            const by = ty - 28 < 0 ? ty + 28 : ty - 28;
            return (
              <g pointerEvents="none">
                <rect x={bx} y={by} width={boxW} height={boxH} rx={3}
                  fill="#0a1420" stroke="rgba(0,212,255,0.45)" strokeWidth="0.8" />
                <text x={bx + 10} y={by + 16} fontSize="10" fill="#00d4ff"
                  fontFamily="'Share Tech Mono', monospace" fontWeight="700">
                  {(p.country || p.country_code).toUpperCase()} · {p.country_code}
                </text>
                <text x={bx + 10} y={by + 30} fontSize="8" fill="rgba(220,235,250,0.85)"
                  fontFamily="'Share Tech Mono', monospace">
                  {p.count} eventos ponderados observados
                </text>
                <text x={bx + 10} y={by + 44} fontSize="7" fill="rgba(150,180,210,0.55)"
                  fontFamily="'Share Tech Mono', monospace">
                  {markerTierLabel(intensity)} · {p.unique_ips} IPs · Clique para investigar
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      <div className={isSoc ? 'soc-map-footer' : undefined} style={isSoc ? undefined : {
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        marginTop: 8, justifyContent: 'space-between',
      }}>
        {!isSoc && (
          <span style={{
            fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            Intensidade visual — volume ponderado de eventos observados
          </span>
        )}
        {!isSoc && (
          <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { color: '#00d4ff', label: 'Baixo' },
              { color: '#b44dff', label: 'Médio' },
              { color: '#ff8800', label: 'Alto' },
              { color: '#ff4040', label: 'Muito alto' },
            ].map(({ color, label }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{label}</span>
              </span>
            ))}
          </span>
        )}
        {isSoc && selectedCode && (
          <span style={{
            fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan)',
            border: '1px solid rgba(0,212,255,0.3)', borderRadius: 2, padding: '2px 8px',
          }}>
            ● INVESTIGANDO: {selectedCode}
          </span>
        )}
        {isSoc && (
          <span style={{
            fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
          }}>
            Volume — não risco · Zoom visual local
          </span>
        )}
      </div>

      {unknownPoint && !isSoc && (
        <button
          onClick={() => handleSelect(unknownPoint)}
          aria-pressed={selectedCode === '??'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            marginTop: 8, padding: '4px 12px', borderRadius: 3,
            border: selectedCode === '??' ? '1px solid var(--cyan)' : '1px solid rgba(255,170,0,0.3)',
            background: selectedCode === '??' ? 'rgba(0,212,255,0.1)' : 'rgba(255,170,0,0.06)',
            color: selectedCode === '??' ? 'var(--cyan)' : 'var(--amber)',
            fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
            cursor: 'pointer',
          }}
        >
          <span style={{ opacity: 0.7 }}>⊙</span>
          ORIGEM NÃO DETERMINADA — {unknownPoint.count} eventos · {unknownPoint.unique_ips} IPs
        </button>
      )}

      {!isSoc && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {geoPoints.slice(0, 10).map((p) => {
            const isSelected = selectedCode === p.country_code;
            return (
              <button
                key={p.country_code}
                onClick={() => handleSelect(p)}
                aria-pressed={isSelected}
                style={{
                  fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                  padding: '3px 8px', borderRadius: 4,
                  border: isSelected ? '1px solid var(--cyan)' : '1px solid rgba(0,212,255,0.22)',
                  background: isSelected ? 'rgba(0,212,255,0.14)' : 'transparent',
                  color: isSelected ? 'var(--cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {p.country_code} <strong>{p.count}</strong>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  if (isSoc) {
    return (
      <div className="soc-map-panel">
        <div className="soc-map-header">
          <h2 className="soc-map-title">Mapa Mundi de Ameaças</h2>
          <div className="soc-map-header-legend" aria-hidden="true">
            <span className="soc-map-header-legend-title">Volume ponderado</span>
            {[
              { color: '#ff4040', label: 'Muito alto' },
              { color: '#ff8800', label: 'Alto' },
              { color: '#b44dff', label: 'Médio' },
              { color: '#00d4ff', label: 'Baixo' },
            ].map(({ color, label }) => (
              <span key={label} className="soc-map-header-legend-item">
                <span
                  className="soc-map-legend-dot"
                  style={{ background: color, boxShadow: `0 0 5px ${color}88` }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
        {mapContent}
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div style={{
          fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em',
          color: 'var(--text-secondary)',
        }}>
          Mapa mundial de ameaças
        </div>
        {selectedCode && (
          <span style={{
            fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan)',
            border: '1px solid rgba(0,212,255,0.3)', borderRadius: 2, padding: '1px 6px',
          }}>
            ● INVESTIGANDO: {selectedCode}
          </span>
        )}
      </div>
      {mapContent}
    </div>
  );
}
