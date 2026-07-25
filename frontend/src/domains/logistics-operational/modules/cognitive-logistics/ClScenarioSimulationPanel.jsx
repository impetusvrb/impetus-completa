import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function ClScenarioSimulationPanel({ scenarios = [], activeScenarioId, scenarioResult, onRun, disabled }) {
  return (
    <section className="cl-scenario-panel" data-cl-panel="scenario">
      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 8px', letterSpacing: 2, textTransform: 'uppercase' }}>
        Scenario simulation (what-if)
      </h4>
      <p style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
        Projeções hipotéticas — sem alteração de estado operacional
      </p>
      <div className="cl-scenario-buttons">
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`btn btn-ghost${activeScenarioId === s.id ? ' btn-primary' : ''}`}
            style={{ borderRadius: 4, fontSize: 11 }}
            disabled={disabled}
            onClick={() => onRun?.(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {scenarioResult && (
        <div className="cl-scenario-result">
          <span style={{ ...mono, fontSize: 11, color: 'var(--cyan)' }}>{scenarioResult.label}</span>
          <p style={{ ...mono, fontSize: 10, color: 'var(--text-secondary)', margin: '6px 0' }}>{scenarioResult.description}</p>
          <div className="cl-panel-grid">
            <div className="cl-panel-card">
              <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Health (baseline → proj.)</span>
              <span style={{ ...mono, fontSize: 12 }}>{scenarioResult.baseline?.health} → {scenarioResult.projected?.health}</span>
            </div>
            <div className="cl-panel-card">
              <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Risco (baseline → proj.)</span>
              <span style={{ ...mono, fontSize: 12 }}>{scenarioResult.baseline?.risk} → {scenarioResult.projected?.risk}</span>
            </div>
            <div className="cl-panel-card">
              <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Filas (baseline → proj.)</span>
              <span style={{ ...mono, fontSize: 12 }}>{scenarioResult.baseline?.queues} → {scenarioResult.projected?.queues}</span>
            </div>
          </div>
          {(scenarioResult.impacts || []).map((imp, idx) => (
            <div key={idx} style={{ ...mono, fontSize: 9, color: imp.severity === 'high' ? 'var(--red)' : 'var(--amber)', marginTop: 4 }}>
              {imp.area}: {imp.delta}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
