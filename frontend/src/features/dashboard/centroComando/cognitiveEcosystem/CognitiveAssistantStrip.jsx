import React, { useState, useEffect } from 'react';

const RECOMMENDATIONS = [
  'Recomendo acompanhamento preventivo na próxima janela de turno.',
  'Priorize alinhamento entre supervisão e RH nas próximas 48h.',
  'Monitore setor crítico com scanner de tensão ativo.'
];

export default function CognitiveAssistantStrip({
  observations = [],
  insights = [],
  memory = [],
  crossSummary,
  activeLinks = 0
}) {
  const [lineIdx, setLineIdx] = useState(0);
  const [recIdx, setRecIdx] = useState(0);
  const lines = observations.length ? observations : ['IA analisando padrões operacionais em tempo real…'];

  useEffect(() => {
    const t = setInterval(() => setLineIdx((i) => (i + 1) % lines.length), 4200);
    return () => clearInterval(t);
  }, [lines.length]);

  useEffect(() => {
    const t = setInterval(() => setRecIdx((i) => (i + 1) % RECOMMENDATIONS.length), 7000);
    return () => clearInterval(t);
  }, []);

  return (
    <aside className="cog-assistant cog-assistant--enterprise" aria-label="Assistente cognitivo enterprise">
      <div className="cog-assistant__glow" aria-hidden />
      <header className="cog-assistant__head">
        <span className="cog-assistant__orb" aria-hidden />
        <div>
          <h3 className="cog-assistant__title">CÉREBRO OPERACIONAL</h3>
          <p className="cog-assistant__badge">IA CORPORATIVA · ATIVA</p>
          <p className="cog-assistant__line">{lines[lineIdx]}</p>
        </div>
      </header>
      <div className="cog-assistant__rec">
        <span className="cog-assistant__block-tag">RECOMENDAÇÃO</span>
        <p>{RECOMMENDATIONS[recIdx]}</p>
      </div>
      {activeLinks > 0 && (
        <p className="cog-assistant__links">
          {activeLinks} conexões cognitivas sincronizadas
        </p>
      )}
      <div className="cog-assistant__block">
        <span className="cog-assistant__block-tag">CONSCIÊNCIA ORG.</span>
        <ul>
          {(insights.length ? insights : ['Interpretando relações organizacionais…']).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
      <div className="cog-assistant__block cog-assistant__block--memory">
        <span className="cog-assistant__block-tag">MEMÓRIA OPERACIONAL</span>
        <ul>
          {(memory.length ? memory : ['Consultando padrões históricos…']).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
      {crossSummary && <p className="cog-assistant__cross">{crossSummary}</p>}
    </aside>
  );
}
