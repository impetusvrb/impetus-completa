// SZ2 — Runtime Z Cognitive OS · frontend opt-in module
//
// Importe os painéis e o hook diretamente; consumidores existentes
// (dashboardContextAdapter, App.jsx) NÃO são modificados — esta camada é
// puramente aditiva e usa o bloco `runtime_z_cognitive_os` já disponível
// em /dashboard/me.

export { default as useCognitiveOsData } from './runtime/useCognitiveOsData';
export * from './runtime/cognitiveOsFormatters';

export { default as ZOperationalContextPanel } from './components/ZOperationalContextPanel';
export { default as ZContinuityInsightsPanel } from './components/ZContinuityInsightsPanel';
export { default as ZOperationalReasoningPanel } from './components/ZOperationalReasoningPanel';
export { default as ZWorkflowInferencePanel } from './components/ZWorkflowInferencePanel';
export { default as ZOperationalMemoryPanel } from './components/ZOperationalMemoryPanel';
export { default as ZAssistiveActionsPanel } from './components/ZAssistiveActionsPanel';
export { default as ZIndustrialAwarenessPanel } from './components/ZIndustrialAwarenessPanel';
export { default as ZOperationalNarrativePanel } from './components/ZOperationalNarrativePanel';
