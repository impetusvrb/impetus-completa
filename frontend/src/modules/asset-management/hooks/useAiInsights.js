import { useCallback, useState } from 'react';

export function useAiInsights() {
  const [insights, setInsights] = useState([]);

  const fetchInsights = useCallback(async () => {
    // Stub mínimo até integração do módulo.
    setInsights([]);
  }, []);

  return { insights, fetchInsights };
}

