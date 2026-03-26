/**
 * Traduz intenções da IA (ou do backend) em chamadas à ponte Unity.
 * Formato esperado: { action: string, target?: string, enabled?: boolean, value?: number }
 */
import * as bridge from './unityBridge';

const VALID_ACTIONS = new Set([
  'highlight_part',
  'explode_view',
  'reset_view',
  'focus_part',
  'show_failure',
  'load_machine',
  'xray_mode',
  'set_transparency',
  'isolate_part',
  'show_inspection_step'
]);

/**
 * @param {object} intent
 * @returns {{ ok: boolean, error?: string }}
 */
export function routeAIVisualIntent(intent) {
  if (!intent || typeof intent !== 'object') {
    return { ok: false, error: 'intent inválido' };
  }
  const action = String(intent.action || '').toLowerCase().replace(/-/g, '_');
  if (!VALID_ACTIONS.has(action)) {
    return { ok: false, error: `ação não suportada: ${action}` };
  }
  const target = intent.target != null ? String(intent.target) : '';

  try {
    switch (action) {
      case 'highlight_part':
        bridge.highlightPart(target);
        break;
      case 'explode_view':
        bridge.explodeView(target);
        break;
      case 'reset_view':
        bridge.resetView();
        break;
      case 'focus_part':
        bridge.focusPart(target);
        break;
      case 'show_failure':
        bridge.showFailure(target);
        break;
      case 'load_machine':
        bridge.loadMachine(target);
        break;
      case 'xray_mode':
        bridge.setXRayMode(!!intent.enabled, target);
        break;
      case 'set_transparency':
        bridge.setTransparency(target, intent.value ?? 0.5);
        break;
      case 'isolate_part':
        bridge.isolatePart(target);
        break;
      case 'show_inspection_step':
        bridge.showInspectionStep(target);
        break;
      default:
        return { ok: false, error: action };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || 'route error' };
  }
}

/**
 * Se a mensagem da IA contiver JSON de comando visual (ex.: bloco ```json), tenta aplicar.
 */
export function tryParseVisualIntentsFromText(text) {
  if (!text || typeof text !== 'string') return;
  const match = text.match(/```json\s*([\s\S]*?)```/i);
  if (!match) return;
  try {
    const data = JSON.parse(match[1].trim());
    if (data.action) routeAIVisualIntent(data);
    if (Array.isArray(data.intents)) data.intents.forEach((i) => routeAIVisualIntent(i));
  } catch {
    /* ignora */
  }
}

/**
 * Consome o payload já parseado do Claude (visão, chat ou áudio) e envia comandos ao Unity.
 * Não altera estado React — apenas unityBridge. Compatível com payloads antigos (highlight, explode, etc.).
 */
export function applyVisualIntentsFromClaudePayload(payload) {
  if (!payload || typeof payload !== 'object') return;

  const list = payload.visualIntents || payload.visual_intents;
  if (Array.isArray(list)) {
    list.forEach((i) => {
      if (i && typeof i === 'object') routeAIVisualIntent(i);
    });
  }
  const single = payload.visualIntent || payload.visual_intent;
  if (single && typeof single === 'object' && single.action) {
    routeAIVisualIntent(single);
  }

  if (typeof payload.message === 'string') tryParseVisualIntentsFromText(payload.message);
  if (typeof payload.mainMessage === 'string') tryParseVisualIntentsFromText(payload.mainMessage);

  if (payload.highlight && typeof payload.highlight === 'string') {
    routeAIVisualIntent({ action: 'highlight_part', target: payload.highlight });
  }
  if (payload.markFault && typeof payload.markFault === 'string') {
    routeAIVisualIntent({ action: 'show_failure', target: payload.markFault });
  }
  if (payload.explode === true) {
    routeAIVisualIntent({ action: 'explode_view', target: 'assembly' });
  }
  if (payload.animationTarget && typeof payload.animationTarget === 'string') {
    if (payload.animationAction === 'remove') {
      routeAIVisualIntent({ action: 'focus_part', target: payload.animationTarget });
      routeAIVisualIntent({ action: 'explode_view', target: payload.animationTarget });
    }
    if (payload.animationAction === 'return') {
      routeAIVisualIntent({ action: 'reset_view' });
    }
    if (payload.animationAction === 'highlight') {
      routeAIVisualIntent({ action: 'highlight_part', target: payload.animationTarget });
    }
  }
}
