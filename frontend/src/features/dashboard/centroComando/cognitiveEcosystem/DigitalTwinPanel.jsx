import React from 'react';
import CognitiveDataStateBadge from './CognitiveDataStateBadge';

export default function DigitalTwinPanel({ twin }) {
  if (!twin) return null;

  const sectors = twin.sectors || [];
  const isEmpty = twin.data_state === 'empty' || sectors.length === 0;
  const maturity = twin.aggregate?.maturity;

  return (
    <section className="cog-twin" aria-label="Digital Twin Organizacional">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// {twin.label?.toUpperCase()}</span>
        {isEmpty ? (
          <CognitiveDataStateBadge dataState={twin.data_state || 'empty'} />
        ) : (
          <span className="cog-panel__meta">maturidade {maturity}%</span>
        )}
      </header>
      <p className="cog-twin__sub">{twin.subtitle}</p>
      {isEmpty && (
        <p className="cog-twin__empty-hint">
          Base Estrutural pronta — aguardando cadastro de equipamentos, ordens e telemetria para
          sincronizar o twin.
        </p>
      )}
      <div className="cog-twin__hierarchy">
        <span>{twin.hierarchy?.root}</span>
        <span className="cog-twin__sep">›</span>
        <span>{twin.hierarchy?.department}</span>
        <span className="cog-twin__sep">›</span>
        <span>{twin.hierarchy?.sector}</span>
      </div>
      <div className="cog-twin__sectors">
        {sectors.map((s) => (
          <div key={s.id} className="cog-twin__sector" style={{ '--heat': `${s.operational_heat}%` }}>
            <span className="cog-twin__sector-name">{s.name}</span>
            <div className="cog-twin__bars">
              <span title="Produtividade">P {s.productivity_index}%</span>
              <span title="Comunicação">C {s.communication_flow}%</span>
            </div>
            <span className={`cog-twin__tension cog-twin__tension--${s.tension}`}>{s.tension}</span>
          </div>
        ))}
      </div>
      <p className="cog-twin__interp">{twin.interpretation}</p>
    </section>
  );
}
