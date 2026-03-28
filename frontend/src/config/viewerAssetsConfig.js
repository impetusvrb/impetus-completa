/**
 * ManuIA — configuração do build Unity WebGL (caminhos públicos).
 * Copie Build/, TemplateData/ e index.html para public/unity/manu-ia-viewer/.
 * O nome do .loader.js é detetado via index.html em runtime; use VITE_UNITY_BUILD_NAME para forçar.
 */
const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
export const UNITY_VIEWER_BASE = `${base}/unity/manu-ia-viewer`;

const envBuild = typeof import.meta.env.VITE_UNITY_BUILD_NAME === 'string'
  ? import.meta.env.VITE_UNITY_BUILD_NAME.trim()
  : '';

/** Fallback se index.html não existir ou não for possível extrair o prefixo dos ficheiros em Build/ */
export const UNITY_BUILD_NAME = envBuild || 'manu-ia-viewer';

/** GameObject no Unity que expõe SendMessage (ver MachineController.cs.example) */
export const UNITY_MACHINE_CONTROLLER = 'MachineController';
