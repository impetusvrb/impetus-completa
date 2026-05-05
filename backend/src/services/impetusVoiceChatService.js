/**
 * Um turno do modo conversa por voz: contexto Impetus + histórico em sessão + TTS.
 */
const chatUserContext = require('./chatUserContext');
const documentContext = require('./documentContext');
const { IMPETUS_IA_SYSTEM_PROMPT_FULL } = require('./impetusAIGovernancePolicy');
const dashboardProfileResolver = require('./dashboardProfileResolver');
const voiceSession = require('./impetusVoiceSession');
const { runAI } = require('../ai/orchestrator');

const MAINTENANCE_PROFILES = new Set([
  'technician_maintenance',
  'supervisor_maintenance',
  'coordinator_maintenance',
  'manager_maintenance'
]);

function isMaintenanceProfile(user) {
  const config = dashboardProfileResolver.getDashboardConfigForUser(user);
  return (
    MAINTENANCE_PROFILES.has(config.profile_code) ||
    (user.functional_area || '').toLowerCase() === 'maintenance' ||
    /mecanico|eletricista|eletromecânico|manutenção/i.test(user.job_title || '')
  );
}

const CHAT_FALLBACK =
  'No momento não consegui responder. Tente de novo em instantes ou use o chat por texto.';

async function buildSystemPrompt(user, message) {
  const chatCtx = await chatUserContext.buildChatUserContext(user);
  const { userName, identityBlock, memoriaBlock } = chatCtx;
  const lgpdProtocol = documentContext.getImpetusLGPDComplianceProtocol();
  const LGPD_BLOCK = lgpdProtocol
    ? `## LGPD e ética\n${lgpdProtocol.slice(0, 2500)}\n`
    : '';

  const MAINT = isMaintenanceProfile(user)
    ? `## Perfil manutenção\nRespostas técnicas, objetivas, foco em diagnóstico e ação.\n`
    : '';

  const system = `${IMPETUS_IA_SYSTEM_PROMPT_FULL}

${LGPD_BLOCK}
${identityBlock || ''}
${memoriaBlock || ''}
${MAINT}
## Modo VOZ (obrigatório):
- Respostas **curtas**: no máximo 3–4 frases salvo se pedirem detalhes.
- Tom natural, sem repetir "Olá" ou "Como posso ajudar?" em toda resposta.
- Não use listas longas nem markdown complexo; fale como em diálogo.
- Português do Brasil.

Usuário: ${userName}.`;
  return { systemPrompt: system, userName: chatCtx.userName || 'Usuário' };
}

/**
 * @returns {Promise<{ reply: string, audio: string|null }>}
 */
async function processVoiceTurn(user, message, { reset } = {}) {
  const trimmed = String(message || '').trim().slice(0, 2000);

  if (reset && !trimmed) {
    voiceSession.clear(user.id);
    return { reply: '', audio: null, cleared: true };
  }

  if (!trimmed) {
    return { reply: 'Não ouvi nada. Pode repetir?', audio: null };
  }

  if (reset) {
    voiceSession.clear(user.id);
  }

  const sensitivePatterns = [
    /senha/i,
    /password/i,
    /credencial/i,
    /cpf/i,
    /chave pix/i,
    /api.?key/i,
    /secret/i
  ];
  if (sensitivePatterns.some((p) => p.test(trimmed))) {
    return {
      reply: 'Esse tipo de assunto é melhor pelo chat em texto, com verificação de segurança.',
      audio: null
    };
  }

  const { systemPrompt } = await buildSystemPrompt(user, trimmed);
  const history = voiceSession.getMessages(user.id);

  let reply = await runAI({
    input: trimmed,
    user,
    context: {
      extraContext: systemPrompt
    },
    mode: 'voice',
    history,
    maxTokens: 500
  });
  if (!reply || (reply || '').startsWith('FALLBACK:')) {
    reply = CHAT_FALLBACK;
  }
  reply = (reply || '').trim().slice(0, 3500);

  voiceSession.append(user.id, 'user', trimmed);
  voiceSession.append(user.id, 'assistant', reply);

  const openaiTts = require('./openaiVozService');
  const buffer = await openaiTts.gerarAudio(reply);
  const audio = buffer && buffer.length ? buffer.toString('base64') : null;

  return { reply, audio };
}

module.exports = { processVoiceTurn };
