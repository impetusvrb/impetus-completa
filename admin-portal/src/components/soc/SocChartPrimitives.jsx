import React from 'react';

const SLICE_COLORS = ['#ff4040', '#ff8800', '#b44dff', '#00d4ff', '#00ff88', '#4a6a82'];

export function SocDonut({ segments, total, centerLabel, size = 120, emptyLabel }) {
  const r = size * 0.36;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const sum = segments.reduce((s, seg) => s + seg.value, 0);

  if (sum <= 0) {
    return (
      <p className="soc-empty" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
        {emptyLabel || 'Sem dados no período.'}
      </p>
    );
  }

  let offset = 0;
  const arcs = segments.filter((s) => s.value > 0).map((seg, i) => {
    const frac = seg.value / sum;
    const dash = frac * circ;
    const el = (
      <circle
        key={seg.key || i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={seg.color || SLICE_COLORS[i % SLICE_COLORS.length]}
        strokeWidth={size * 0.11}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        opacity={0.92}
      />
    );
    offset += dash;
    return el;
  });

  return (
    <div className="soc-donut-wrap">
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,212,255,0.08)" strokeWidth={size * 0.11} />
        {arcs}
      </svg>
      <div className="soc-donut-center">
        <span className="soc-donut-total">{total ?? sum}</span>
        {centerLabel && <span className="soc-donut-label">{centerLabel}</span>}
      </div>
    </div>
  );
}

export function SocHBarList({ rows, maxRows = 6, emptyLabel }) {
  if (!rows?.length) {
    return (
      <p className="soc-empty" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
        {emptyLabel || 'Sem telemetria categorizada.'}
      </p>
    );
  }
  const max = Math.max(1, ...rows.map((r) => r.count || 0));
  return (
    <div className="soc-hbar-list">
      {rows.slice(0, maxRows).map((row) => (
        <div key={row.type || row.label} className="soc-hbar-row">
          <div className="soc-hbar-meta">
            <span className="soc-hbar-name">{row.type || row.label}</span>
            <span className="soc-hbar-val">
              {row.count?.toLocaleString('pt-BR')}
              {row.pct != null ? ` · ${row.pct}%` : ''}
            </span>
          </div>
          <div className="soc-hbar-track">
            <div
              className="soc-hbar-fill"
              style={{ width: `${Math.max(4, ((row.count || 0) / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SocLineArea({ series, emptyLabel }) {
  const pts = series || [];
  const hasData = pts.some((p) => p.count > 0);
  if (!hasData) {
    return (
      <p className="soc-empty" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
        {emptyLabel || 'TELEMETRIA TEMPORAL INSUFICIENTE'}
      </p>
    );
  }

  const w = 280;
  const h = 88;
  const pad = 8;
  const max = Math.max(1, ...pts.map((p) => p.count));
  const step = pts.length > 1 ? (w - pad * 2) / (pts.length - 1) : 0;

  const coords = pts.map((p, i) => {
    const x = pad + i * step;
    const y = h - pad - ((p.count / max) * (h - pad * 2));
    return { x, y, ...p };
  });

  const lineD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaD = `${lineD} L${coords[coords.length - 1].x},${h - pad} L${coords[0].x},${h - pad} Z`;

  return (
    <div className="soc-line-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="soc-line-svg">
        <defs>
          <linearGradient id="soc-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(180,77,255,0.45)" />
            <stop offset="100%" stopColor="rgba(180,77,255,0.02)" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#soc-area-grad)" />
        <path d={lineD} fill="none" stroke="#b44dff" strokeWidth="1.5" />
        {coords.filter((c) => c.count === max && max > 0).slice(0, 1).map((c) => (
          <circle key="peak" cx={c.x} cy={c.y} r="3" fill="#b44dff" />
        ))}
      </svg>
      <div className="soc-line-labels">
        {coords.filter((_, i) => i % 4 === 0 || i === coords.length - 1).map((c) => (
          <span key={c.label}>{c.label}</span>
        ))}
      </div>
    </div>
  );
}
