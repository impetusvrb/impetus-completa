/**
 * MOBILE-ANAM-003 / MOBILE-ANAM-004 / MOBILE-ANAM-004A
 * Classificação estruturada de estados operacionais ANAM.
 */

/** Estados operacionais canónicos — não inferir por texto de erro. */
export const ANAM_STATE = {
  DISABLED: 'disabled',
  CONNECTING: 'connecting',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  RESPONDING: 'responding',
  REPORTING: 'reporting',
  CONNECTED: 'connected',
  READY: 'ready',
  ERROR: 'error'
};

const PROGRESS_PATTERNS = [
  /libertar sessão/i,
  /aguarde alguns segundos/i,
  /aguarde 10s/i,
  /a ligar anam/i,
  /a ligar escuta/i
];

const INFO_PATTERNS = [
  /sem HTTPS/i,
  /WebRTC podem falhar/i,
  /Toque na avatar/i,
  /Ok Impetus/i,
  /comando por voz indisponível/i,
  /Permita o microfone/i
];

/** Mensagem transitória — não exibir como card de erro. */
export function isTransientOperationalMessage(msg) {
  if (!msg || typeof msg !== 'string') return false;
  const t = msg.trim();
  if (!t) return false;
  return PROGRESS_PATTERNS.some((p) => p.test(t)) || INFO_PATTERNS.some((p) => p.test(t));
}

/** Falha real de conexão ou operação — exibir alerta discreto (mobile) ou card (desktop). */
export function isRealOperationalFailure(msg) {
  if (!msg || typeof msg !== 'string') return false;
  const t = msg.trim();
  if (!t) return false;
  if (isTransientOperationalMessage(t)) return false;
  return true;
}

/**
 * ANAM desativada por configuração — flags estruturadas.
 * Prioridade: DISABLED > ERROR (MOBILE-ANAM-004A).
 * Não isenta checking/connecting quando anamConfigured === false.
 */
export function isAnamModuleDisabled({ anamEnabled, anamStatus, anamConfigured }) {
  if (anamStatus === 'unconfigured') return true;
  if (anamConfigured === false) return true;
  if (!anamEnabled && anamConfigured === false) return true;
  return false;
}

/** Mensagem amigável para falhas reais de conexão ANAM. */
export function normalizeFailureMessage() {
  return 'Falha de conexão com a ANAM';
}

function buildDisabledState(anamStatus) {
  return {
    state: ANAM_STATE.DISABLED,
    pill: { label: 'Inativa', tone: 'inactive' },
    avatarSubtitle:
      anamStatus === 'unconfigured' ? 'Indisponível nesta instalação' : 'Módulo não habilitado',
    showError: false,
    decisionReason:
      anamStatus === 'unconfigured'
        ? 'anamStatus === unconfigured'
        : 'anamConfigured === false'
  };
}

/**
 * Resolve estado operacional completo para overlay mobile/desktop.
 */
export function resolveAnamOperationalState({
  status,
  anamStatus,
  anamStreaming,
  anamEnabled,
  anamConfigured,
  micActive,
  panelLoading,
  hasRealFailure = false
}) {
  const disabledInput = { anamEnabled, anamStatus, anamConfigured };

  if (isAnamModuleDisabled(disabledInput)) {
    return buildDisabledState(anamStatus);
  }

  if (hasRealFailure || anamStatus === 'error') {
    return {
      state: ANAM_STATE.ERROR,
      failureMessage: normalizeFailureMessage(),
      showError: true,
      decisionReason: hasRealFailure ? 'hasRealFailure === true' : "anamStatus === 'error'"
    };
  }

  if (panelLoading) {
    return {
      state: ANAM_STATE.REPORTING,
      pill: { label: 'Gerando relatório…', tone: 'processing' },
      showError: false,
      decisionReason: 'panelLoading === true'
    };
  }

  if (anamEnabled) {
    if (anamStatus === 'checking' || anamStatus === 'connecting') {
      return {
        state: ANAM_STATE.CONNECTING,
        pill: { label: 'Conectando…', tone: 'connecting' },
        showError: false,
        decisionReason: "anamEnabled && status checking/connecting"
      };
    }
    if (anamStreaming || anamStatus === 'streaming') {
      if (status === 'speaking') {
        return {
          state: ANAM_STATE.RESPONDING,
          pill: { label: 'Respondendo…', tone: 'speaking' },
          showError: false,
          decisionReason: 'streaming + speaking'
        };
      }
      if (status === 'processing') {
        return {
          state: ANAM_STATE.PROCESSING,
          pill: { label: 'Analisando…', tone: 'processing' },
          showError: false,
          decisionReason: 'streaming + processing'
        };
      }
      if (status === 'listening') {
        return {
          state: ANAM_STATE.LISTENING,
          pill: { label: 'Ouvindo', tone: 'listening' },
          showError: false,
          decisionReason: 'streaming + listening'
        };
      }
      return {
        state: ANAM_STATE.CONNECTED,
        pill: { label: 'Conectada', tone: 'connected' },
        showError: false,
        decisionReason: 'streaming idle'
      };
    }
  }

  if (status === 'speaking') {
    return {
      state: ANAM_STATE.RESPONDING,
      pill: { label: 'Respondendo…', tone: 'speaking' },
      showError: false,
      decisionReason: 'voice speaking without anam stream'
    };
  }
  if (status === 'processing') {
    return {
      state: ANAM_STATE.PROCESSING,
      pill: { label: 'Analisando…', tone: 'processing' },
      showError: false,
      decisionReason: 'voice processing'
    };
  }
  if (status === 'listening' || micActive) {
    return {
      state: ANAM_STATE.LISTENING,
      pill: { label: 'Ouvindo', tone: 'listening' },
      showError: false,
      decisionReason: 'voice listening'
    };
  }

  return {
    state: ANAM_STATE.READY,
    pill: { label: 'Pronta', tone: 'ready' },
    showError: false,
    decisionReason: 'default ready'
  };
}

/** Log estruturado para auditoria MOBILE-ANAM-004A (dev / certificação). */
export function buildAnamOperationalAuditPayload(input) {
  const disabled = isAnamModuleDisabled({
    anamEnabled: input.anamEnabled,
    anamStatus: input.anamStatus,
    anamConfigured: input.anamConfigured
  });
  const resolved = resolveAnamOperationalState(input);
  return {
    at: new Date().toISOString(),
    input: {
      anamEnabled: input.anamEnabled,
      anamConfigured: input.anamConfigured,
      anamStatus: input.anamStatus,
      anamStreaming: input.anamStreaming,
      hasRealFailure: input.hasRealFailure,
      panelLoading: input.panelLoading,
      voiceStatus: input.status
    },
    isAnamModuleDisabled: disabled,
    output: {
      state: resolved.state,
      showError: resolved.showError,
      pill: resolved.pill?.label,
      avatarSubtitle: resolved.avatarSubtitle,
      failureMessage: resolved.failureMessage,
      decisionReason: resolved.decisionReason
    }
  };
}

/** @deprecated Preferir resolveAnamOperationalState. */
export function resolveCompactOperationalStatus(params) {
  const resolved = resolveAnamOperationalState({ ...params, hasRealFailure: false });
  return resolved.pill || { label: 'Pronta', tone: 'ready' };
}
