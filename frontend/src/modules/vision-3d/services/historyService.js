/**
 * IMPETUS - ManuIA 3D Vision - Histórico de diagnósticos (IndexedDB)
 * Armazena sessões por equipamento — 100% local no browser
 */
import { get, set } from 'idb-keyval';

const KEY_PREFIX = 'manuia:history:';

function storageKey(machineId) {
  return `${KEY_PREFIX}${machineId || 'default'}`;
}

/**
 * Salva uma sessão de diagnóstico
 * @param {string} machineId - ID do equipamento
 * @param {object} sessionData - { id, timestamp, equipment, severity, confidence, faultParts, steps, parts, imageThumb }
 */
export async function saveSession(machineId, sessionData) {
  const key = storageKey(machineId);
  const existing = (await get(key)) || [];
  const session = {
    id: sessionData.id || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: sessionData.timestamp || new Date().toISOString(),
    equipment: sessionData.equipment || '',
    severity: sessionData.severity || 'NORMAL',
    confidence: sessionData.confidence ?? 0,
    faultParts: sessionData.faultParts || [],
    steps: sessionData.steps || [],
    parts: sessionData.parts || [],
    imageThumb: sessionData.imageThumb || null,
    machineType: sessionData.machineType || 'generico'
  };
  const updated = [session, ...existing].slice(0, 50);
  await set(key, updated);
  return session;
}

/**
 * Retorna sessões do equipamento ordenadas por data (mais recente primeiro)
 */
export async function getSessions(machineId) {
  const key = storageKey(machineId);
  const sessions = (await get(key)) || [];
  return sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Remove uma sessão específica
 */
export async function deleteSession(machineId, sessionId) {
  const key = storageKey(machineId);
  let sessions = (await get(key)) || [];
  sessions = sessions.filter((s) => s.id !== sessionId);
  await set(key, sessions);
}

/**
 * Limpa todo o histórico do equipamento
 */
export async function clearHistory(machineId) {
  await set(storageKey(machineId), []);
}

/**
 * Gera thumbnail da imagem capturada (120x80, jpeg quality 0.5)
 */
export function createImageThumb(base64Image) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, 120, 80);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        resolve(dataUrl.replace(/^data:image\/jpeg;base64,/, ''));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => resolve(null);
    img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
  });
}
