import React from 'react';
import { EnvironmentOperationalHubBase } from '../shared/EnvironmentOperationalHubBase.jsx';

export function EffluentOperationalHub() {
  return (
    <EnvironmentOperationalHubBase
      area="effluent"
      title="ETE / Efluentes"
      subtitle="pH, DBO, DQO, sólidos, vazão e temperatura."
      eventName="environment.effluent.analysis_completed"
      recordLabel="Registrar análise"
      fields={[
        { key: 'ph', label: 'pH', type: 'number', inputMode: 'decimal' },
        { key: 'dbo', label: 'DBO (mg/L)', type: 'number', inputMode: 'decimal' },
        { key: 'dqo', label: 'DQO (mg/L)', type: 'number', inputMode: 'decimal' },
        { key: 'flow', label: 'Vazão (m³/h)', type: 'number', inputMode: 'decimal' },
        { key: 'solids', label: 'Sólidos', type: 'text' },
        { key: 'temperature', label: 'Temperatura (°C)', type: 'number', inputMode: 'decimal' }
      ]}
    />
  );
}

export function EffluentSamplingWorkspace() {
  return <EffluentOperationalHub />;
}

export function EffluentRealtimeWorkspace() {
  return <EffluentOperationalHub />;
}

export function EffluentIncidentWorkspace() {
  return (
    <EnvironmentOperationalHubBase
      area="effluent"
      title="NC Ambiental — Efluente"
      subtitle="Registo de não conformidade ambiental."
      eventName="environment.environmental.incident_opened"
      recordLabel="Abrir NC"
      fields={[
        { key: 'severity', label: 'Severidade', placeholder: 'moderate' },
        { key: 'description', label: 'Descrição', placeholder: 'Desvio detectado' }
      ]}
    />
  );
}

export default EffluentOperationalHub;
