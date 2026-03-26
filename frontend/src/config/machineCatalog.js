/**
 * Catálogo de máquinas / modelos — mapeia tipos da pesquisa IA e keywords para IDs estáveis no Unity.
 * Expanda conforme novos assets forem adicionados ao projeto Unity.
 */
export const MACHINE_CATALOG = [
  {
    id: 'motor_generic',
    type: 'motor',
    category: 'elétrico',
    keywords: ['motor', 'weg', 'siemens', 'cv', 'kw', 'rpm'],
    unityModelId: 'motor_generic',
    components: ['body', 'shaft', 'fan', 'terminal_box'],
    commonFailures: ['rolamento', 'bobina', 'escovas']
  },
  {
    id: 'pump_generic',
    type: 'pump',
    category: 'hidráulico',
    keywords: ['bomba', 'grundfos', 'schneider', 'voluta', 'impeller'],
    unityModelId: 'pump_generic',
    components: ['volute', 'impeller', 'inlet', 'outlet', 'motor'],
    commonFailures: ['selo', 'rolamento', 'cavitação']
  },
  {
    id: 'panel_generic',
    type: 'panel',
    category: 'elétrico',
    keywords: ['quadro', 'painel', 'nsx', 'disjuntor', 'clp'],
    unityModelId: 'panel_generic',
    components: ['cabinet', 'door', 'display', 'terminals'],
    commonFailures: ['fusível', 'contator', 'sobretensão']
  },
  {
    id: 'compressor_generic',
    type: 'compressor',
    category: 'pneumático',
    keywords: ['compressor', 'pistão', 'cilindro'],
    unityModelId: 'compressor_generic',
    components: ['case', 'motor', 'head', 'tank'],
    commonFailures: ['válvula', 'filtro', 'óleo']
  },
  {
    id: 'generic',
    type: 'generic',
    category: 'outro',
    keywords: [],
    unityModelId: 'generic',
    components: ['body'],
    commonFailures: []
  }
];

/**
 * Resolve catalog id a partir do resultado da pesquisa (model_3d_type) ou texto livre.
 */
export function resolveCatalogEntryFromResearch(research) {
  if (!research) return MACHINE_CATALOG.find((e) => e.id === 'generic');
  const t = String(research.model_3d_type || research.equipment?.category || '').toLowerCase();
  const name = String(research.equipment?.name || '').toLowerCase();
  const hay = `${t} ${name}`;
  const byType = MACHINE_CATALOG.find((e) => e.type === t || e.id === `${t}_generic` || e.type === t.replace('_generic', ''));
  if (byType) return byType;
  for (const entry of MACHINE_CATALOG) {
    if (entry.keywords.some((k) => hay.includes(k))) return entry;
  }
  return MACHINE_CATALOG.find((e) => e.id === 'generic');
}
