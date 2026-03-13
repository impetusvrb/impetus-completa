export function useVoiceOutput() {
  return {
    speak: () => {},
    stop: () => {},
    isSpeaking: false,
  };
}
