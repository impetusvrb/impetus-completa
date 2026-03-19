import React, { createContext, useContext } from 'react';

export const ImpetusVoiceContext = createContext(null);

export function useImpetusVoice() {
  const ctx = useContext(ImpetusVoiceContext);
  if (!ctx) throw new Error('useImpetusVoice deve ser usado dentro de ImpetusVoiceProvider');
  return ctx;
}

