'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isChatAlignmentRuntimeEnabled: () => _flag('IMPETUS_CHAT_ALIGNMENT_RUNTIME', false),
  isChatGuidanceQualityEnabled: () => _flag('IMPETUS_CHAT_GUIDANCE_QUALITY', false),
  isChatReasoningStabilizationEnabled: () => _flag('IMPETUS_CHAT_REASONING_STABILIZATION', false),
  isChatHierarchyIsolationEnabled: () => _flag('IMPETUS_CHAT_HIERARCHY_ISOLATION', false),
  isChatLeakageDetectionEnabled: () => _flag('IMPETUS_CHAT_LEAKAGE_DETECTION', false),
  isChatRuntimeObservabilityEnabled: () => _flag('IMPETUS_CHAT_RUNTIME_OBSERVABILITY', true)
};
