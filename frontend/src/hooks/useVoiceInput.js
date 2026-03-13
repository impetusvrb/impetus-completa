export function useVoiceInput({ onResult, onError } = {}) {
  return {
    isListening: false,
    isSupported: false,
    startListening: () => {},
    stopListening: () => {},
  };
}
