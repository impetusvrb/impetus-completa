/**
 * ManuIA — configuração do build Unity WebGL (caminhos públicos).
 * Após exportar o projeto Unity, copie a pasta Build/ para public/unity/manu-ia-viewer/Build/
 * e ajuste UNITY_BUILD_FILE se o nome do ficheiro .loader.js for diferente.
 */
const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
export const UNITY_VIEWER_BASE = `${base}/unity/manu-ia-viewer`;

/** Nome base do ficheiro gerado pelo Unity (ex.: ManuIAViewer.loader.js → "ManuIAViewer") */
export const UNITY_BUILD_NAME = 'ManuIAViewer';

/** GameObject no Unity que expõe SendMessage (ver MachineController.cs.example) */
export const UNITY_MACHINE_CONTROLLER = 'MachineController';
