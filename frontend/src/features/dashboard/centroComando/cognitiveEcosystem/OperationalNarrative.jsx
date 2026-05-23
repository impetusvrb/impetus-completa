import React from 'react';

export default function OperationalNarrative({ narrative }) {
  if (!narrative?.paragraphs?.length) return null;
  return (
    <section className="cog-narrative" aria-label="Narrativa operacional">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// {narrative.title?.toUpperCase() || 'NARRATIVA'}</span>
        <span className="cog-panel__meta">{narrative.horizon}</span>
      </header>
      <div className="cog-narrative__body">
        {narrative.paragraphs.map((p, i) => (
          <p key={i} className="cog-narrative__p">
            {p}
          </p>
        ))}
      </div>
      <footer className="cog-narrative__foot">{narrative.author}</footer>
    </section>
  );
}
