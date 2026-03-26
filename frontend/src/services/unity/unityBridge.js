/**
 * Ponte JavaScript ↔ Unity WebGL (SendMessage).
 * Requer GameObject UNITY_MACHINE_CONTROLLER com métodos públicos compatíveis com o build Unity.
 */
import { UNITY_MACHINE_CONTROLLER } from '../../config/viewerAssetsConfig';

let unityInstance = null;
const queue = [];

function flushQueue() {
  if (!unityInstance) return;
  while (queue.length) {
    const [method, arg] = queue.shift();
    try {
      unityInstance.SendMessage(UNITY_MACHINE_CONTROLLER, method, arg == null ? '' : String(arg));
    } catch (e) {
      console.warn('[ManuIA Unity]', method, e?.message);
    }
  }
}

export function setUnityInstance(instance) {
  unityInstance = instance || null;
  flushQueue();
}

export function isUnityReady() {
  return !!unityInstance;
}

function enqueue(method, arg) {
  if (unityInstance) {
    try {
      unityInstance.SendMessage(UNITY_MACHINE_CONTROLLER, method, arg == null ? '' : String(arg));
    } catch (e) {
      console.warn('[ManuIA Unity]', method, e?.message);
    }
  } else {
    queue.push([method, arg]);
  }
}

export function highlightPart(partName) {
  enqueue('HighlightPart', partName);
}

export function explodeView(target) {
  enqueue('ExplodeView', target || '');
}

export function resetView() {
  enqueue('ResetView', '');
}

export function focusPart(partName) {
  enqueue('FocusPart', partName);
}

export function showFailure(failureName) {
  enqueue('ShowFailure', failureName);
}

export function loadMachine(machineName) {
  enqueue('LoadMachine', machineName);
}

export function setXRayMode(enabled, target) {
  enqueue('SetXRayMode', JSON.stringify({ enabled: !!enabled, target: target || '' }));
}

export function setTransparency(target, value) {
  enqueue('SetTransparency', JSON.stringify({ target: target || '', value: Number(value) }));
}

export function isolatePart(partName) {
  enqueue('IsolatePart', partName);
}

export function showInspectionStep(stepName) {
  enqueue('ShowInspectionStep', stepName);
}

/** Fila de comandos antes do Unity estar pronto (útil para modo sem build) */
export function clearCommandQueue() {
  queue.length = 0;
}
