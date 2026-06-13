/**
 * AIOI-P8.2 — Executive Runtime Authorization Policies (READ ONLY)
 *
 * Política formal de autorização — sem execução, sem ativação.
 */

export const RUNTIME_AUTHORIZATION_POLICY = Object.freeze({
  allowAuthorization: false,
  allowExecution: false,
  allowInference: false,
  allowActivation: false
});

/**
 * @returns {{ allowAuthorization: boolean, allowExecution: boolean, allowInference: boolean, allowActivation: boolean }}
 */
export function getRuntimeAuthorizationPolicy() {
  return RUNTIME_AUTHORIZATION_POLICY;
}

export default getRuntimeAuthorizationPolicy;
