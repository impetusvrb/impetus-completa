/**
 * Módulo mínimo para medição de tempo de import dinâmico (shadow rollout).
 */
import { getOperationalRuntimeSnapshot } from '../operational-runtime/qualityOperationalFeatureFlags.js';

export const SHADOW_PROBES = getOperationalRuntimeSnapshot();
