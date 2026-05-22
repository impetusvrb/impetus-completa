import React from 'react';

export default function CognitiveNeuralMesh({ graph }) {
  if (!graph?.nodes?.length) return null;
  const { nodes, links } = graph;

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <section className="cog-neural" aria-label="Rede cognitiva conectada">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// REDE COGNITIVA</span>
        <span className="cog-panel__meta">{links?.length || 0} vínculos ativos</span>
      </header>
      <svg className="cog-neural__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="cogLinkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,212,255,0.05)" />
            <stop offset="50%" stopColor="rgba(0,212,255,0.45)" />
            <stop offset="100%" stopColor="rgba(0,212,255,0.05)" />
          </linearGradient>
        </defs>
        {(links || []).map((l, i) => {
          const a = nodeById[l.from];
          const b = nodeById[l.to];
          if (!a || !b) return null;
          return (
            <line
              key={`${l.from}-${l.to}-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className="cog-neural__link"
              stroke="url(#cogLinkGrad)"
              strokeWidth={0.4 + (l.strength || 0.3) * 1.2}
              opacity={0.35 + (l.strength || 0.3) * 0.5}
            />
          );
        })}
        {nodes.map((n) => (
          <g key={n.id} className={`cog-neural__node cog-neural__node--${n.role || 'sector'}`}>
            <circle
              cx={n.x}
              cy={n.y}
              r={n.role === 'core' ? 5.5 : 3.8}
              className="cog-neural__dot"
            />
            <text x={n.x} y={n.y + (n.role === 'core' ? 9 : 7)} className="cog-neural__label">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}
