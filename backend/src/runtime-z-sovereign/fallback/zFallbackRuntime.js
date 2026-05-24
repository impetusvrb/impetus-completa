'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');
const { incrementFallback } = require('../observability/zSovereignObservability');

/**
 * zFallbackRuntime — degradação nativa do Runtime Z. Não usa Motor A nem
 * V2: usa apenas dados já presentes no payload Z (perfil, módulos
 * permitidos, sections) para devolver um layout mínimo coerente.
 *
 * Política: NUNCA devolver vazio. Se nada estiver disponível, devolve
 * placeholders de empty-state que permitem a UI manter-se viva.
 */
function buildSovereignFallback(user = {}, payload = {}, _ctx = {}) {
  if (!flags.isFallbackRuntimeEnabled()) {
    return { fallback: null, runtime_skipped: true };
  }

  const role = user?.role || 'colaborador';
  const dept = user?.functional_area || user?.department || user?.area || '';
  const profile = payload.profile_code || user?.dashboard_profile || 'generic';

  const visibleModules = Array.isArray(payload.visible_modules) ? payload.visible_modules : [];
  const sections = Array.isArray(payload.sections) ? payload.sections : [];

  const widgets = [];
  const seen = new Set();

  for (let i = 0; i < Math.min(visibleModules.length, 6); i++) {
    const m = visibleModules[i];
    if (seen.has(m)) continue;
    seen.add(m);
    widgets.push({
      id: `z_fallback_module_${m}`,
      label: m,
      position: { row: Math.floor(i / 2), col: (i % 2) * 2, width: 2 },
      tier: 'fallback',
      source: 'z_fallback_runtime',
      raw: { module: m, fallback: true }
    });
  }

  if (!widgets.length) {
    widgets.push({
      id: 'z_fallback_welcome',
      label: 'Centro de Comando',
      position: { row: 0, col: 0, width: 4 },
      tier: 'fallback',
      source: 'z_fallback_runtime_empty_state',
      raw: { empty_state: true, profile, role, dept }
    });
  }

  incrementFallback();

  return {
    fallback: {
      widgets,
      perfil: {
        titulo: 'Centro de Comando',
        subtitulo: `Modo degradado supervisionado · ${profile}`
      },
      assistente_ia: {
        especialidade: null,
        exemplos_perguntas: [],
        alertas_contextuais: [],
        mensagens_fallback: ['Operando em modo degradado supervisionado.']
      },
      sections,
      empty: visibleModules.length === 0,
      source: 'z_fallback_runtime',
      degraded: true
    },
    runtime: 'runtime_z',
    standalone: true,
    rollback_safe: true,
    auto_mutation: false
  };
}

module.exports = { buildSovereignFallback };
