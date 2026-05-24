/**
 * zCompatibilityRuntime — encapsula referências ao Motor A e Engine V2
 * presentes no payload `/dashboard/me`. Não substitui nem desliga nada:
 * apenas reexporta os blocos legacy num formato uniforme para que a UI
 * soberana saiba como degradar.
 */

export function buildCompatibilityRuntime(meData = {}) {
  const legacyWidgets = Array.isArray(meData?.widgets_legacy) ? meData.widgets_legacy : [];
  const profileWidgets =
    Array.isArray(meData?.profile_config?.widgets) ? meData.profile_config.widgets : [];
  const v2Widgets = meData?.engine_v2?.payload?.layout?.widgets || [];

  return {
    motor_a: {
      profile_code: meData?.profile_code || null,
      profile_label: meData?.profile_label || null,
      widgets: legacyWidgets.length ? legacyWidgets : profileWidgets,
      kpis: Array.isArray(meData?.kpis) ? meData.kpis : [],
      sections: Array.isArray(meData?.sections) ? meData.sections : [],
      visible_modules: Array.isArray(meData?.visible_modules) ? meData.visible_modules : [],
      role: 'supervised_fallback'
    },
    engine_v2: {
      mode:
        meData?.engine_v2_retirement_runtime?.engine_v2_runtime_mode ||
        'retired_shadow_reference',
      widgets: v2Widgets,
      identity: meData?.engine_v2?.payload?.identity || null,
      explainability: meData?.engine_v2?.payload?.explainability || null,
      role: 'shadow_reference_only'
    },
    invariants: {
      motor_a_never_deleted: true,
      engine_v2_never_deleted: true
    }
  };
}

export default buildCompatibilityRuntime;
