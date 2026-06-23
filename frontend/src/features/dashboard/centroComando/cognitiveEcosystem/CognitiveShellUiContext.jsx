import React, { createContext, useContext } from 'react';

const CognitiveShellUiContext = createContext(null);

export function CognitiveShellUiProvider({ value, children }) {
  return (
    <CognitiveShellUiContext.Provider value={value}>
      {children}
    </CognitiveShellUiContext.Provider>
  );
}

export function useCognitiveShellUi() {
  return useContext(CognitiveShellUiContext);
}

export default CognitiveShellUiContext;
