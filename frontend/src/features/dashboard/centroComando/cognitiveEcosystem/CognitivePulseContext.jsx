import React, { createContext, useContext } from 'react';
import useCognitivePulse from './useCognitivePulse';

const CognitivePulseContext = createContext(null);

export function CognitivePulseProvider({ children }) {
  const value = useCognitivePulse();
  return (
    <CognitivePulseContext.Provider value={value}>{children}</CognitivePulseContext.Provider>
  );
}

export function useCognitivePulseContext() {
  return useContext(CognitivePulseContext);
}

export default CognitivePulseContext;
