import React, { useEffect, useRef } from 'react';

const AGENT_COLORS = {
  rh: 'green',
  prod: 'cyan',
  man: 'amber',
  seg: 'red',
  est: 'cyan',
  ops: 'green',
  comp: 'amber'
};

export default function MultiAgentCouncil({ multiAgents }) {
  const dialogueRef = useRef(null);
  if (!multiAgents) return null;
  const { agents = [], dialogue = [], consensus } = multiAgents;

  useEffect(() => {
    const el = dialogueRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [dialogue.length]);

  return (
    <section className="cog-agents" aria-label="Conselho IA multiagente">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// CONSELHO MULTIAGENTE</span>
        <span className="cog-panel__live">SYNC</span>
      </header>
      <div className="cog-agents__grid">
        {agents.map((a) => (
          <div
            key={a.id}
            className={`cog-agents__card cog-agents__card--${AGENT_COLORS[a.id] || 'cyan'} ${a.status === 'ACTIVE' ? 'cog-agents__card--live' : ''}`}
          >
            <span className="cog-agents__name">{a.name}</span>
            {a.persona && (
              <span className="cog-agents__persona">
                {a.persona.style} · {a.persona.tone}
              </span>
            )}
            <span className="cog-agents__focus">{a.focus}</span>
            <span className="cog-agents__conf">{a.confidence_pct}%</span>
          </div>
        ))}
      </div>
      <div className="cog-agents__dialogue" ref={dialogueRef}>
        {dialogue.map((d) => (
          <div key={d.id} className={`cog-agents__line cog-agents__line--${d.tone || 'neutra'}`}>
            <span className="cog-agents__time">[{d.time}]</span>
            <span className="cog-agents__from">{agents.find((a) => a.id === d.from)?.name || d.from}</span>
            <span className="cog-agents__arrow">→</span>
            <span className="cog-agents__msg">{d.message}</span>
          </div>
        ))}
      </div>
      {consensus && <p className="cog-agents__consensus">{consensus}</p>}
    </section>
  );
}
