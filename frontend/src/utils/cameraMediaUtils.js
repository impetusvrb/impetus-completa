/**
 * IMPETUS — utilitários seguros para câmera (getUserMedia)
 * Android Chrome: enumerateDevices antes da permissão devolve deviceId vazio —
 * usar facingMode primeiro e só depois deviceId com { ideal }.
 */

export function isSecureMediaContext() {
  if (typeof window === 'undefined') return false;
  return (
    window.isSecureContext === true ||
    window.location?.protocol === 'https:' ||
    window.location?.hostname === 'localhost' ||
    window.location?.hostname === '127.0.0.1'
  );
}

export function isGetUserMediaSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * @param {DOMException|Error|null|undefined} err
 * @returns {{ code: string, message: string, canRetry: boolean, logLabel: string }}
 */
export function mapMediaError(err) {
  const name = err?.name || '';
  const raw = String(err?.message || '').trim();

  if (name === 'NotSupportedError') {
    return {
      code: 'unsupported',
      message: 'Seu navegador não suporta acesso à câmera. Use Upload para enviar fotos.',
      canRetry: false,
      logLabel: 'CAMERA_UNSUPPORTED'
    };
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      code: 'permission_denied',
      message:
        'Permissão da câmera negada. Toque em «Iniciar assistência» novamente e permita o acesso nas configurações do navegador.',
      canRetry: true,
      logLabel: 'CAMERA_PERMISSION_DENIED'
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      code: 'no_device',
      message: 'Nenhuma câmera encontrada neste dispositivo. Use «Upload» para enviar uma foto.',
      canRetry: false,
      logLabel: 'CAMERA_NOT_FOUND'
    };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      code: 'in_use',
      message:
        'A câmera está em uso por outro aplicativo. Feche outros apps que usam a câmera e tente novamente.',
      canRetry: true,
      logLabel: 'CAMERA_IN_USE'
    };
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return {
      code: 'constraint',
      message: 'Não foi possível usar a câmera selecionada. Tentando câmera alternativa…',
      canRetry: true,
      logLabel: 'CAMERA_OVERCONSTRAINED'
    };
  }
  if (name === 'SecurityError' || !isSecureMediaContext()) {
    return {
      code: 'insecure',
      message: 'A câmera só funciona em HTTPS. Acesse o IMPETUS por conexão segura (https://).',
      canRetry: false,
      logLabel: 'CAMERA_INSECURE_CONTEXT'
    };
  }
  if (name === 'AbortError') {
    return {
      code: 'aborted',
      message: 'Acesso à câmera interrompido. Tente novamente.',
      canRetry: true,
      logLabel: 'CAMERA_ABORTED'
    };
  }

  return {
    code: 'unknown',
    message: raw || 'Não foi possível acessar a câmera. Verifique permissões ou use Upload.',
    canRetry: true,
    logLabel: 'CAMERA_UNKNOWN'
  };
}

export function buildVideoConstraints({ deviceId, facingMode = 'environment' }) {
  const id = String(deviceId || '').trim();
  if (id) {
    return { deviceId: { ideal: id }, facingMode: { ideal: facingMode } };
  }
  return { facingMode: { ideal: facingMode } };
}

/**
 * @param {{ deviceId?: string, facingMode?: 'environment'|'user', audio?: boolean }} opts
 */
export async function requestCameraStream(opts = {}) {
  const { deviceId, facingMode = 'environment', audio = false } = opts;

  if (!isGetUserMediaSupported()) {
    const e = new Error('Seu navegador não suporta acesso à câmera.');
    e.name = 'NotSupportedError';
    throw e;
  }
  if (!isSecureMediaContext()) {
    const e = new Error('Contexto inseguro');
    e.name = 'SecurityError';
    throw e;
  }

  const video = buildVideoConstraints({ deviceId, facingMode });
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio });
  } catch (primaryErr) {
    if (deviceId) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio
        });
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
    throw primaryErr;
  }
}

export async function enumerateVideoDevices() {
  if (!navigator?.mediaDevices?.enumerateDevices) return [];
  const list = await navigator.mediaDevices.enumerateDevices();
  return list.filter((d) => d.kind === 'videoinput' && d.deviceId);
}

export function stopMediaStream(stream) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }
}

export async function attachStreamToVideo(videoEl, stream) {
  if (!videoEl || !stream) return;
  videoEl.srcObject = stream;
  try {
    await videoEl.play();
  } catch (playErr) {
    if (playErr?.name !== 'AbortError') throw playErr;
  }
}
