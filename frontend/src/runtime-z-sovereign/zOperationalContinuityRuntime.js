/**
 * zOperationalContinuityRuntime — última linha de defesa do frontend.
 * Garante que a UI nunca colapsa para um ecrã totalmente vazio quando o
 * payload `/dashboard/me` está degradado.
 *
 * Política:
 *  - Se não há widgets, mostra empty-state explícito com instruções.
 *  - Se Motor A foi a única fonte, marca degraded=true para o utilizador
 *    saber visualmente.
 *  - Nunca substitui o design system — apenas devolve metadata.
 */

export function ensureFrontendContinuity(layoutOut = {}, meData = {}) {
  const widgets = Array.isArray(layoutOut?.widgets) ? layoutOut.widgets : [];
  const fallbackUsed = !!layoutOut?.fallback_used;
  const allDegraded = !!layoutOut?.degraded;

  if (widgets.length > 0) {
    return {
      mode: fallbackUsed ? 'degraded_fallback' : allDegraded ? 'compatibility' : 'sovereign',
      blank_screen_prevented: false,
      widgets,
      message: null
    };
  }

  const profileCode = meData?.profile_code || meData?.runtime_z_sovereign?.bootstrap?.compatibility?.payload?.profile_code;
  return {
    mode: 'empty_state',
    blank_screen_prevented: true,
    widgets: [
      {
        id: 'z_continuity_empty_state',
        label: 'Centro de Comando',
        position: { row: 0, col: 0, width: 4 },
        tier: 5,
        source: 'runtime_z_continuity',
        raw: {
          empty_state: true,
          profile: profileCode,
          message:
            'O painel está em modo de continuidade. Os widgets serão restaurados automaticamente quando o estado operacional estabilizar.'
        }
      }
    ],
    message: 'Modo de continuidade activo. Nenhuma funcionalidade foi removida.'
  };
}

export default ensureFrontendContinuity;
