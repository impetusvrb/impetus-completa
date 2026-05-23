import React from 'react';

function OrgNode({ node, depth = 0 }) {
  const intensity = node.intensity ?? 40;
  return (
    <li className={`cog-orgmap__node cog-orgmap__node--d${depth}`}>
      <div
        className={`cog-orgmap__card ${node.pulse ? 'cog-orgmap__card--pulse' : ''}`}
        style={{ '--heat': `${intensity}%` }}
      >
        <span className="cog-orgmap__name">{node.name}</span>
        <span className={`cog-orgmap__status cog-orgmap__status--${node.status || 'estável'}`}>
          {node.status || 'estável'}
        </span>
        {node.communication_flow_pct != null && (
          <span className="cog-orgmap__flow" title="Fluxo comunicação">
            COM {node.communication_flow_pct}%
          </span>
        )}
        {node.intensity != null && (
          <span className="cog-orgmap__heat">{Math.round(intensity)}%</span>
        )}
      </div>
      {node.children?.length > 0 && (
        <ul className="cog-orgmap__children">
          {node.children.map((c) => (
            <OrgNode key={c.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function LiveOrgMap({ orgMap }) {
  const root = orgMap?.root;
  if (!root) return null;
  return (
    <section className="cog-orgmap" aria-label="Mapa organizacional vivo">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// MAPA ORGANIZACIONAL VIVO</span>
        {orgMap.flows && (
          <span className="cog-panel__meta">
            COM {orgMap.flows.communication_health}% · OPS {orgMap.flows.operational_throughput}%
          </span>
        )}
      </header>
      <ul className="cog-orgmap__tree">
        <OrgNode node={root} />
      </ul>
    </section>
  );
}
