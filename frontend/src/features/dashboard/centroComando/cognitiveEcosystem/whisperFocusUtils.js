/** INC-019/020 — intersecção geométrica e resolução de superfície analítica. */
export function rectsIntersect(a, b) {
  if (!a || !b) return false;
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export const WHISPER_SELECTOR = '.cog-whispers--scroll-persist, .cog-whispers__item';

export const WHISPER_FOCUS_SURFACE_SELECTOR = [
  '[data-whisper-focus-surface]',
  '.impetus-card',
  '.card',
  '.live-dash-widget-card',
  '.live-dash-dynamic-card',
  '.live-surface-card',
  '.cc__cell--alive',
  '.live-dash-timebar',
  '.live-dash-plan-item',
  '.live-dash-orchestration-card',
  '.live-dash-summary',
  '.live-dash-personalization',
  '.live-dash-focus',
  '.live-dash-dynamic',
  '.live-dash-alerts-preview',
  '.live-dash-signals',
  '.live-dash-dynamic-group',
  '.live-intelligent-dashboard > section',
].join(', ');

const WHISPER_EXCLUDE_ANCESTOR = '.cc-top-cognitive-presence, .cc-cognitive-continuity-row';

export function isWhisperTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(target.closest(WHISPER_SELECTOR));
}

export function resolveWhisperFocusSurface(target, root) {
  if (!target || !(target instanceof Element)) return null;
  if (isWhisperTarget(target)) return null;

  const boundedRoot = root instanceof Element ? root : document.querySelector('.cc.cc--premium');
  if (!boundedRoot || !boundedRoot.contains(target)) return null;

  const direct = target.closest(WHISPER_FOCUS_SURFACE_SELECTOR);
  if (direct && !direct.closest(WHISPER_EXCLUDE_ANCESTOR)) return direct;

  let el = target;
  while (el && el instanceof Element && boundedRoot.contains(el)) {
    if (el.closest(WHISPER_EXCLUDE_ANCESTOR)) return null;
    if (el.matches?.(WHISPER_FOCUS_SURFACE_SELECTOR)) return el;
    if (el === boundedRoot) break;
    el = el.parentElement;
  }

  return null;
}
