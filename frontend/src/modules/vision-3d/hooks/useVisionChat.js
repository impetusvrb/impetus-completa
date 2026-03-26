/**
 * IMPETUS - ManuIA 3D Vision - Chat multi-turn com Claude API
 * Analise inicial da imagem + histórico de conversa + ações 3D via JSON
 * Persiste sessões no IndexedDB (historyService)
 */
import { useState, useCallback, useRef } from 'react';
import { callClaude } from '../services/claudeApi';
import { saveSession, getSessions, createImageThumb } from '../services/historyService';
import { VISION_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT, AUDIO_ANALYSIS_PROMPT } from '../constants/systemPrompts';
import { applyVisualIntentsFromClaudePayload } from '../../../services/unity/aiVisualCommandRouter';

export function useVisionChat({ onAction, machineId, machineName, machineType: initialMachineType }) {
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
        applyVisualIntentsFromClaudePayload(res);
        onAction?.({ type: 'ANALYSIS_COMPLETE', payload: res });

        try {
          const imageThumb = await createImageThumb(base64Image);
          await saveSession(machineId, {
            equipment: res.equipment,
            severity: res.severity,
            confidence: res.confidence,
            faultParts: res.faultParts || [],
            steps: res.steps || [],
            parts: res.parts || [],
            imageThumb,
            machineType: res.machineType
          });
        } catch (e) {
          console.warn('[ManuIA] saveSession:', e?.message);
        }

        return res;
      } finally {
        setIsLoading(false);
      }
    },
    [onAction, machineId]
  );

  const analyzeAudio = useCallback(
    async (spectrum, peaks, machineType = initialMachineType || 'generico') => {
      setIsLoading(true);
      try {
        const system = AUDIO_ANALYSIS_PROMPT(spectrum, peaks, machineType);
        const res = await callClaude({
          system,
          maxTokens: 500,
          messages: [{ role: 'user', content: [{ type: 'text', text: 'Analise o espectro de vibração e retorne o JSON.' }] }]
        });

        let raw = {};
        try {
          raw = typeof res === 'string' ? JSON.parse(res) : (res && typeof res === 'object' ? res : {});
        } catch {
          raw = { faultType: 'normal', severity: 'ok', message: 'Não foi possível analisar o espectro.', affectedPart: '', recommendedAction: '' };
        }
        const severityMap = { ok: 'NORMAL', warn: 'ALERTA', critical: 'CRITICO' };
        const part = raw.affectedPart || 'Componente';
        const converted = {
          equipment: machineName || 'Equipamento (análise por áudio)',
          manufacturer: 'Não identificado',
          machineType: initialMachineType || 'generico',
          severity: severityMap[raw.severity] || 'ALERTA',
          confidence: raw.confidence ?? 70,
          faultParts: raw.faultType !== 'normal' ? [part] : [],
          highlightParts: raw.faultType !== 'normal' ? [part] : [],
          mainMessage: `<span class="hi">${raw.message || ''}</span><br><br><strong>Ação:</strong> ${raw.recommendedAction || ''}`,
          steps: raw.recommendedAction ? [{ title: raw.recommendedAction, desc: raw.message }] : [],
          parts: [],
          webSources: [],
          detections: [{ label: raw.faultType, type: raw.severity === 'critical' ? 'critical' : raw.severity === 'warn' ? 'warning' : 'ok' }],
          triggerExplode: raw.faultType !== 'normal',
          followUpQuestion: 'Deseja gerar ordem de serviço?',
          _audioDiagnosis: raw
        };

        setResult(converted);
        setMessages((prev) => [...prev, { role: 'assistant', ...converted }]);
        applyVisualIntentsFromClaudePayload(converted);
        onAction?.({ type: 'ANALYSIS_COMPLETE', payload: converted });

        try {
          await saveSession(machineId, {
            equipment: converted.equipment,
            severity: converted.severity,
            confidence: converted.confidence,
            faultParts: converted.faultParts || [],
            steps: converted.steps || [],
            parts: converted.parts || [],
            imageThumb: null,
            machineType: converted.machineType
          });
        } catch (e) {
          console.warn('[ManuIA] saveSession audio:', e?.message);
        }

        return converted;
      } finally {
        setIsLoading(false);
      }
    },
    [onAction, machineId, machineName, initialMachineType]
  );

  const sendMessage = useCallback(
    async (userText) => {
      historyRef.current.push({ role: 'user', content: userText });
      setMessages((prev) => [...prev, { role: 'user', content: userText }]);
      setIsLoading(true);
      try {
        let previousSessions = [];
        try {
          const sessions = await getSessions(machineId);
          previousSessions = sessions.slice(0, 3).map((s) => ({
            date: s.timestamp,
            severity: s.severity,
            faultParts: s.faultParts || []
          }));
        } catch (e) {
          console.warn('[ManuIA] getSessions:', e?.message);
        }

        const context = result
          ? { equipment: result.equipment, severity: result.severity, previousSessions }
          : { previousSessions };
        const res = await callClaude({
          system: CHAT_SYSTEM_PROMPT(context),
          maxTokens: 700,
          messages: historyRef.current
        });

        historyRef.current.push({ role: 'assistant', content: JSON.stringify(res) });
        setMessages((prev) => [...prev, { role: 'assistant', message: res.message, ...res }]);
        applyVisualIntentsFromClaudePayload(res);
        onAction?.({ type: 'CHAT_RESPONSE', payload: res });
        return res;
      } finally {
        setIsLoading(false);
      }
    },
    [result, onAction, machineId]
  );

  return { messages, isLoading, result, analyzeImage, analyzeAudio, sendMessage };
}
