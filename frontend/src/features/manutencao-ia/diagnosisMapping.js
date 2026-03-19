/**
 * IMPETUS - ManuIA - Mapeamento sintoma → componente 3D
 * Usado para diagnóstico guiado: câmera, pulsação e desmontagem
 * Keys: mesh names no DynamicMachineBuilder; order: prioridade
 */
export const SYMPTOM_TO_COMPONENTS = {
  no_power: {
    motor: ['terminal_box', 'body'],
    pump: ['impeller', 'volute'],
    panel: ['display', 'door', 'cabinet'],
    compressor: ['motor', 'head'],
    inverter: ['display', 'terminals', 'case'],
    generic: ['body']
  },
  overheating: {
    motor: ['body', 'fan', 'terminal_box'],
    pump: ['impeller', 'volute'],
    panel: ['cabinet'],
    compressor: ['motor', 'head', 'tank'],
    inverter: ['case', 'terminals'],
    generic: ['body']
  },
  noise: {
    motor: ['fan', 'shaft', 'body'],
    pump: ['impeller', 'inlet', 'outlet'],
    panel: [],
    compressor: ['motor', 'head'],
    inverter: [],
    generic: ['body']
  },
  vibration: {
    motor: ['shaft', 'fan', 'body'],
    pump: ['impeller', 'shaft', 'volute'],
    panel: [],
    compressor: ['motor', 'head'],
    inverter: [],
    generic: ['body']
  },
  pressure_flow: {
    motor: [],
    pump: ['impeller', 'inlet', 'outlet', 'volute'],
    panel: [],
    compressor: ['head', 'tank'],
    inverter: [],
    generic: ['body']
  },
  stuck: {
    motor: ['shaft', 'fan', 'body'],
    pump: ['impeller', 'shaft'],
    panel: ['door'],
    compressor: ['motor', 'head'],
    inverter: [],
    generic: ['body']
  },
  other: {
    motor: ['body', 'terminal_box', 'fan', 'shaft'],
    pump: ['volute', 'impeller', 'inlet', 'outlet'],
    panel: ['cabinet', 'door', 'display'],
    compressor: ['tank', 'motor', 'head'],
    inverter: ['case', 'display', 'terminals'],
    generic: ['body']
  }
};

/** Posições aproximadas dos meshes (em coordenadas locais * 1.5 scale) */
export const COMPONENT_WORLD_POSITIONS = {
  body: [0, 0, 0],
  shaft: [0, 0, 2.25],
  fan: [0, 0, -2.1],
  terminal_box: [0, 1.95, 0],
  volute: [0, 0, 0],
  impeller: [0, 0, 0.75],
  inlet: [0, 0, -0.9],
  outlet: [1.05, 0, 0],
  cabinet: [0, 0, 0],
  door: [0, 0, 0.525],
  display: [0, 0.45, 0.57],
  tank: [0, 0, 1.125],
  motor: [0, 0, -1.8],
  head: [0, 0, 1.65],
  case: [0, 0, 0],
  terminals: [0, -0.225, 0.33]
};

/** Meshes por tipo de modelo (nomes no DynamicMachineBuilder) */
export const MODEL_MESHES = {
  motor: ['body', 'shaft', 'fan', 'terminal_box'],
  pump: ['volute', 'impeller', 'inlet', 'outlet'],
  panel: ['cabinet', 'door', 'display'],
  compressor: ['tank', 'motor', 'head'],
  inverter: ['case', 'display', 'terminals'],
  generic: ['body']
};

/** Retorna o primeiro componente válido para o sintoma e tipo de equipamento */
export function getDiagnosisComponent(symptomId, modelType, availableMeshes = null) {
  const meshes = availableMeshes || MODEL_MESHES[modelType] || MODEL_MESHES.generic;
  const byType = SYMPTOM_TO_COMPONENTS[symptomId] || SYMPTOM_TO_COMPONENTS.other;
  const list = byType[modelType] || byType.generic || ['body'];
  return list.find((m) => meshes.includes(m)) || list[0] || 'body';
}
