/**
 * CONTEXTO UNIFICADO DO USUÁRIO PARA O CHAT
 * Agrega: user_activation_profiles, memoria_usuario, memoria_empresa, req.user
 * Garante que a IA sempre receba nome, cargo e perfil quando disponíveis
 */
const userIdentification = require('./userIdentificationService');
const onboardingService = require('./onboardingService');

/**
 * Monta contexto completo para o chat da IA
 * @param {Object} user - req.user
 * @returns {{ userName, role, identityBlock, memoriaBlock }}
 */
async function buildChatUserContext(user) {
  const userId = user?.id;
  const companyId = user?.company_id;
  const baseName = user?.name || user?.email?.split('@')[0] || 'Usuário';
  const role = user?.role || 'colaborador';
  const hierarchyLevel = user?.hierarchy_level ?? 5;
  const jobTitle = user?.job_title || '';
  const area = user?.area || '';

  let userName = baseName;
  let identityBlock = '';
  let memoriaBlock = '';

  // 1. user_activation_profiles (ativação/identificação)
  const activationCtx = await userIdentification.getContextForAI(user);
  if (activationCtx?.fullName) {
    userName = activationCtx.fullName;
    identityBlock = `## Usuário identificado:
- **Nome:** ${activationCtx.fullName}
- **Cargo:** ${activationCtx.jobTitle || jobTitle || role}
- **Setor:** ${activationCtx.department || area}
${activationCtx.dailyActivities ? `- **Atividades:** ${activationCtx.dailyActivities}` : ''}

A identidade foi validada. Trate o usuário pelo nome. Quando perguntarem como você sabe quem são, responda que o Impetus valida identidade via ativação inicial e verificação diária (nome + PIN).`;
  } else {
    // Fallback: usar dados de req.user e memoria quando disponíveis
    identityBlock = `## Usuário logado:
- **Nome:** ${userName}
- **Cargo/Função:** ${jobTitle || role}
- **Área:** ${area || '(não informada)'}
- **Nível hierárquico:** ${hierarchyLevel}

Trate o usuário pelo nome e respeite seu nível hierárquico.`;
  }

  // 2. memoria_usuario e memoria_empresa (onboarding estratégico)
  try {
    const memoria = await onboardingService.getMemoryContext(user);
    const parts = [];

    if (memoria?.company?.resumo_executivo || memoria?.company?.perfil_estrategico) {
      const ceo = memoria.company.resumo_executivo ? `\nResumo: ${String(memoria.company.resumo_executivo).slice(0, 400)}...` : '';
      const perfil = memoria.company.perfil_estrategico
        ? `\nPerfil: ${JSON.stringify(memoria.company.perfil_estrategico)}` : '';
      parts.push(`### Contexto da empresa${ceo}${perfil}`);
    }

    if (memoria?.user?.resumo_estrategico || memoria?.user?.perfil_tecnico) {
      const resumo = memoria.user.resumo_estrategico ? `\n${memoria.user.resumo_estrategico}` : '';
      const perfil = memoria.user.perfil_tecnico ? `\nPerfil técnico: ${JSON.stringify(memoria.user.perfil_tecnico)}` : '';
      parts.push(`### Perfil do usuário (onboarding)${resumo}${perfil}`);
    }

    if (parts.length > 0) {
      memoriaBlock = '\n## Memória estratégica (onboarding):\n' + parts.join('\n');
    }
  } catch (err) {
    console.warn('[CHAT_CONTEXT] getMemoryContext:', err.message);
  }

  return {
    userName,
    role,
    hierarchyLevel,
    identityBlock,
    memoriaBlock
  };
}

module.exports = { buildChatUserContext };
