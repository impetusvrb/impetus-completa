/**
 * IMPETUS - ManuIA 3D Vision - Chat multi-turn com Claude API
 * Analise inicial da imagem + histórico de conversa + ações 3D via JSON
 */
import { useState, useCallback, useRef } from 'react';
import { callClaude } from '../services/claudeApi';
import { VISION_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from '../constants/systemPrompts';

export function useVisionChat({ onAction }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const historyRef = useRef([]);

  const analyzeImage = useCallback(
    async (base64Image) => {
      setIsLoading(true);
      try {
        const res = await callClaude({
          system: VISION_SYSTEM_PROMPT,
          maxTokens: 2000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: 'image/jpeg', data: base64Image }
                },
                { type: 'text', text: 'Analise este equipamento e inicie o diagnóstico 3D.' }
              ]
            }
          ]
        });

        historyRef.current = [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
              { type: 'text', text: 'Analise este equipamento.' }
            ]
          },
          { role: 'assistant', content: JSON.stringify(res) }
        ];

        setResult(res);
        setMessages((prev) => [...prev, { role: 'assistant', ...res }]);
        onAction?.({ type: 'ANALYSIS_COMPLETE', payload: res });
        return res;
      } finally {
        setIsLoading(false);
      }
    },
    [onAction]
  );

  const sendMessage = useCallback(
    async (userText) => {
      historyRef.current.push({ role: 'user', content: userText });
      setMessages((prev) => [...prev, { role: 'user', content: userText }]);
      setIsLoading(true);
      try {
        const context = result ? { equipment: result.equipment, severity: result.severity } : {};
        const res = await callClaude({
          system: CHAT_SYSTEM_PROMPT(context),
          maxTokens: 700,
          messages: historyRef.current
        });

        historyRef.current.push({ role: 'assistant', content: JSON.stringify(res) });
        setMessages((prev) => [...prev, { role: 'assistant', message: res.message, ...res }]);
        onAction?.({ type: 'CHAT_RESPONSE', payload: res });
        return res;
      } finally {
        setIsLoading(false);
      }
    },
    [result, onAction]
  );

  return { messages, isLoading, result, analyzeImage, sendMessage };
}
