import { useEffect, useMemo, useState } from 'react';

/**
 * Hook puro de leitura — recebe o payload `runtime_z_cognitive_os` já
 * presente em /dashboard/me e expõe acessores normalizados aos painéis.
 *
 * Não faz fetch, não toca rota, não altera estado global.
 */
export default function useCognitiveOsData(payload) {
  const [snapshot, setSnapshot] = useState(payload || null);

  useEffect(() => {
    setSnapshot(payload || null);
  }, [payload]);

  return useMemo(() => {
    const cog = snapshot || {};
    return {
      available: !!snapshot,
      stage: cog.stage || 'Z_COGNITIVE_SHADOW',
      assistive_only: cog.assistive_only !== false,
      memory: cog.memory || null,
      continuity: cog.continuity || null,
      context: cog.context || null,
      reasoning: cog.reasoning || null,
      actions: cog.actions || null,
      intent: cog.intent || null,
      attention: cog.attention || null,
      awareness: cog.awareness || null,
      fusion: cog.fusion || null,
      narrative: cog.narrative || null,
      governance: cog.governance || null,
      shadow: cog.shadow || null,
      metrics: cog.metrics || null,
      cognitive_state: cog.cognitive_state || null
    };
  }, [snapshot]);
}
