import { useState, useEffect, useCallback } from 'react';
import { isUnityReady } from '../services/unity/unityBridge';

/**
 * Estado de prontidão do viewer Unity (instância injetada pelo ManuIAUnityViewer).
 */
export function useUnityViewer() {
  const [ready, setReady] = useState(() => isUnityReady());

  const sync = useCallback(() => {
    setReady(isUnityReady());
  }, []);

  useEffect(() => {
    const id = setInterval(sync, 400);
    return () => clearInterval(id);
  }, [sync]);

  return { ready, sync };
}
