/**
 * ARC-003 — Observabilidade EOX (aditiva; não altera telemetria existente).
 */

const EOX_EVENTS = Object.freeze({
  HEADER_RENDER: 'EOX_HEADER_RENDER',
  BREADCRUMB_NAVIGATION: 'EOX_BREADCRUMB_NAVIGATION',
  DOMAIN_RETURN: 'EOX_DOMAIN_RETURN',
  GLOBAL_RETURN: 'EOX_GLOBAL_RETURN',
  ACTION_BAR: 'EOX_ACTION_BAR'
});

function emit(event, payload = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('impetus:eox', {
        detail: { event, phase: 'ARC-003', ts: Date.now(), ...payload }
      })
    );
  } catch {
    /* noop — observabilidade best-effort */
  }
}

export function trackEoxHeaderRender(config) {
  emit(EOX_EVENTS.HEADER_RENDER, {
    domainId: config?.domainId,
    module: config?.module,
    phase: config?.phase
  });
}

export function trackEoxBreadcrumbNavigation(item) {
  emit(EOX_EVENTS.BREADCRUMB_NAVIGATION, {
    label: item?.label,
    path: item?.path
  });
}

export function trackEoxDomainReturn(target) {
  emit(EOX_EVENTS.DOMAIN_RETURN, {
    label: target?.shortLabel || target?.label,
    path: target?.path
  });
}

export function trackEoxGlobalReturn(target) {
  emit(EOX_EVENTS.GLOBAL_RETURN, {
    label: target?.shortLabel || target?.label,
    path: target?.path
  });
}

export function trackEoxActionBar(actionId) {
  emit(EOX_EVENTS.ACTION_BAR, { actionId });
}

export { EOX_EVENTS };
