import React, { useState, useEffect } from 'react';

const RECOMMENDATIONS = [
  'Recomendo acompanhamento preventivo na próxima janela de turno.',
  'Priorize alinhamento entre supervisão e RH nas próximas 48h.',
  'Antecipe redistribuição de carga no setor com maior tensão operacional.',
  'Valide hipótese de causa-efeito antes de escalar risco organizacional.'
];

export default function CognitiveAssistantStrip({
  observations = [],
  insights = [],
  memory = [],
  crossSummary,
  activeLinks = 0,
  executiveSummary = [],
  narrative
}) {
  const [lineIdx, setLineIdx] = useState(0);
  const [recIdx, setRecIdx] = useState(0);
  const lines = observations.length ? observations : ['IA analisando padrões organizacionais em tempo real…'];

  useEffect(() => {
    const t = setInterval(() => setLineIdx((i) => (i + 1) % lines.length), 4000);
    return () => clearInterval(t);
  }, [lines.length]);

  useEffect(() => {
    const t = setInterval(() => setRecIdx((i) => (i + 1) % RECOMMENDATIONS.length), 6500);
    return () => clearInterval(t);
  }, []);

  return (
    <aside className="cog-assistant cog-assistant--executive" aria-label="Assistente executivo cognitivo">
      <div className="cog-assistant__glow" aria-hidden />
      <header className="cog-assistant__head">
        <span className="cog-assistant__orb" aria-hidden />
        <div>
          <h3 className="cog-assistant__title">CONSULTOR ESTRATÉGICO IA</h3>
          <p className="cog-assistant__badge">ENTIDADE ORGANIZACIONAL · ATIVA</p>
          <p className="cog-assistant__line">{lines[lineIdx]}</p>
        </div>
      </header>

      {executiveSummary.length > 0 && (
        <div className="cog-assistant__exec">
          <span className="cog-assistant__block-tag">RESUMO EXECUTIVO</span>
          {executiveSummary.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>
      )}

      {narrative?.paragraphs?.[0] && (
        <blockquote className="cog-assistant__quote">{narrative.paragraphs[0]}</blockquote>
      )}

      <div className="cog-assistant__rec">
        <span className="cog-assistant__block-tag">AÇÃO SUGERIDA</span>
        <p>{RECOMMENDATIONS[recIdx]}</p>
      </div>

      {activeLinks > 0 && (
        <p className="cog-assistant__links">{activeLinks} vínculos na rede cognitiva</p>
      )}

      <div className="cog-assistant__block">
        <span className="cog-assistant__block-tag">PERCEPÇÃO ORG.</span>
        <ul>
          {(insights.length ? insights : ['Interpretando comportamento organizacional…']).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="cog-assistant__block cog-assistant__block--memory">
        <span className="cog-assistant__block-tag">MEMÓRIA</span>
        <ul>
          {(memory.length ? memory : ['Comparando históricos e recorrências…']).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      {crossSummary && <p className="cog-assistant__cross">{crossSummary}</p>}
    </aside>
  );
}
