/**
 * Reforço no cliente: alinha visible_modules ao perfil estrutural devolvido por /dashboard/me.
 * Módulos universais (PróAção, Registro Inteligente, Cadastrar com IA, dashboard, settings) nunca são removidos.
 */

const UNIVERSAL_KEYS = new Set([
  'dashboard',
  'settings',
  'proaction',
  'registro_inteligente',
  'cadastrar_com_ia',
  'ai',
  'chat'
]);

const AXIS_MODULE_MAP = {
  eixo_qualidade: ['quality_intelligence', 'raw_material_lots'],
  eixo_seguranca: ['safety_intelligence'],
  eixo_ambiental: ['environment_intelligence'],
  eixo_sustentabilidade: ['environment_intelligence'],
  eixo_logistica: ['logistics_intelligence'],
  eixo_estoque: ['logistics_intelligence', 'raw_material_lots'],
  eixo_humano: ['hr_intelligence', 'operational'],
  eixo_manutencao: ['manuia', 'operational'],
  eixo_financeiro: ['operational', 'anomaly_detection'],
  eixo_executivo: ['operational', 'anomaly_detection', 'audit', 'hr_intelligence'],
  eixo_operacional: ['operational', 'quality_intelligence', 'manuia', 'safety_intelligence'],
  eixo_planejamento: ['operational', 'anomaly_detection']
};

const PLATFORM_KEYS = new Set(['chat', 'biblioteca', 'ai']);

function _axisSet(structuralProfile) {
  const axes = new Set(structuralProfile?.eixos || []);
  if (structuralProfile?.eixo_primario) axes.add(structuralProfile.eixo_primario);
  return axes;
}

function _moduleAllowed(key, axisSet) {
  if (UNIVERSAL_KEYS.has(key) || PLATFORM_KEYS.has(key)) return true;
  if (key === 'admin' || key === 'audit') return true;
  for (const [axis, mods] of Object.entries(AXIS_MODULE_MAP)) {
    if (axisSet.has(axis) && mods.includes(key)) return true;
  }
  return false;
}

/**
 * @param {string[]} modules
 * @param {object|null} structuralProfile from /dashboard/me
 * @returns {string[]}
 */
function _isHrProfile(sp) {
  const p = String(sp?.dashboard_profile || '').toLowerCase();
  return p.includes('hr') || p === 'hr_management' || sp?.eixo_primario === 'eixo_humano';
}

export function filterVisibleModulesByStructuralProfile(modules, structuralProfile) {
  if (!Array.isArray(modules) || !structuralProfile) return modules || [];
  if (_isHrProfile(structuralProfile)) {
    return modules.filter((k) => {
      if (UNIVERSAL_KEYS.has(k) || PLATFORM_KEYS.has(k)) return true;
      if (k === 'hr_intelligence' || k === 'operational') return true;
      if (k === 'audit' || k === 'chat' || k === 'biblioteca' || k === 'ai') return true;
      if (k === 'safety_intelligence' || k === 'quality_intelligence' || k === 'environment_intelligence') {
        return false;
      }
      return _moduleAllowed(k, _axisSet(structuralProfile));
    });
  }
  const axisSet = _axisSet(structuralProfile);
  if (!axisSet.size) return modules;
  return modules.filter((k) => {
    if (k === 'safety_intelligence' && structuralProfile.eixo_primario !== 'eixo_seguranca') {
      return false;
    }
    return _moduleAllowed(k, axisSet);
  });
}

export { UNIVERSAL_KEYS };
