/**
 * zDashboardContextRuntime — façade frontend opcional do Runtime Z
 * Sovereign. PASSIVO: não substitui `dashboardContextAdapter`. Apenas
 * expõe uma vista alternativa que prefere Z, depois personalization,
 * depois V2 (compatibility), depois Motor A, depois fallback nativo Z.
 *
 * Para activar: importar e usar quando o cockpit decidir migrar.
 * O adapter actual continua a ser a fonte primária do `CentroComando`.
 */

import { buildSovereignLayout } from './zLayoutRuntime.js';
import { planWidgetHydration } from './zWidgetHydrationRuntime.js';
import { buildCompatibilityRuntime } from './zCompatibilityRuntime.js';
import { ensureFrontendContinuity } from './zOperationalContinuityRuntime.js';

export const SOVEREIGN_SOURCE = Object.freeze({
  Z_NATIVE: 'runtime_z_native',
  Z_PROMOTED: 'runtime_z_promoted',
  PERSONALIZATION: 'personalization',
  ENGINE_V2: 'engine_v2_compatibility',
  MOTOR_A: 'motor_a_legacy',
  FALLBACK: 'runtime_z_fallback',
  EMPTY_STATE: 'runtime_z_continuity'
});

export function buildSovereignDashboardContext(meData = {}, opts = {}) {
  const layout = buildSovereignLayout(meData);
  const hydration = planWidgetHydration(meData, layout.widgets);
  const compatibility = buildCompatibilityRuntime(meData);
  const continuity = ensureFrontendContinuity(layout, meData);

  const finalWidgets = continuity.widgets.length ? continuity.widgets : layout.widgets;
  const source = continuity.mode === 'empty_state'
    ? SOVEREIGN_SOURCE.EMPTY_STATE
    : continuity.mode === 'compatibility'
      ? SOVEREIGN_SOURCE.MOTOR_A
      : continuity.mode === 'degraded_fallback'
        ? SOVEREIGN_SOURCE.FALLBACK
        : SOVEREIGN_SOURCE.Z_PROMOTED;

  return {
    source,
    widgets: finalWidgets,
    hydration: hydration.summary,
    hydration_plan: hydration.plan,
    layout_metadata: layout.tier_counts,
    perfil: {
      titulo: meData?.profile_label || 'Centro de Comando',
      subtitulo:
        meData?.runtime_z_sovereign?.stage
          ? `Sovereign Z · stage ${meData.runtime_z_sovereign.stage}`
          : ''
    },
    assistente_ia: {
      especialidade: meData?.personalization?.assistant_specialty || null,
      exemplos_perguntas: [],
      alertas_contextuais: [],
      mensagens_fallback: continuity.message ? [continuity.message] : []
    },
    sovereign_runtime: meData?.runtime_z_sovereign || null,
    compatibility,
    continuity_mode: continuity.mode,
    blank_screen_prevented: continuity.blank_screen_prevented,
    degraded: layout.degraded || continuity.mode !== 'sovereign',
    is_contextual: true,
    sovereign_first: true,
    opts
  };
}

export default buildSovereignDashboardContext;
