/**
 * Gauge industrial leve (SVG) — sem dependências extras.
 */
import React, { useMemo } from 'react';

export default function IndustrialMiniGauge({ value = 0, max = 100, color = 'var(--cyan)', size = 52, label }) {
  const pct = Math.min(100, Math.max(0, (Number(value) / (max || 100)) * 100));
  const { strokeDash } = useMemo(() => {
    const r = (size - 8) / 2;
    const c = 2 * Math.PI * r;
    return { strokeDash: `${(pct / 100) * c} ${c}` };
  }, [pct, size]);

  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="cc-gauge" title={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="4"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={strokeDash}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.35))' }}
        />
      </svg>
      <span className="cc-gauge__pct">{Math.round(pct)}%</span>
    </div>
  );
}
