import React, { createContext, useContext } from 'react';
import useCognitivePulse from './useCognitivePulse';

const CognitivePulseContext = createContext(null);

export function CognitivePulseProvider({ children }) {
  const parent = useContext(CognitivePulseContext);
  if (parent) return children;

  const value = useCognitivePulse();
  return (
    <CognitivePulseContext.Provider value={value}>{children}</CognitivePulseContext.Provider>
  );
}

const EMPTY_PULSE_CONTEXT = Object.freeze({
  pulse: null,
  loading: false,
  error: null,
  refresh: () => Promise.resolve()
});

export function useCognitivePulseContext() {
  const ctx = useContext(CognitivePulseContext);
  return ctx || EMPTY_PULSE_CONTEXT;
}

export default CognitivePulseContext;
