'use strict';

/**
 * @param {{ userDisplayName?: string, localHour?: number }} ctx
 */
function buildAnamOpeningLine(ctx = {}) {
  const hourRaw = ctx.localHour;
  const hour = Number.isFinite(Number(hourRaw)) ? Number(hourRaw) : new Date().getHours();

  let greeting = 'Boa noite';
  if (hour >= 5 && hour < 12) greeting = 'Bom dia';
  else if (hour >= 12 && hour < 18) greeting = 'Boa tarde';

  const firstName =
    String(ctx.userDisplayName || '')
      .trim()
      .split(/\s+/)[0] || '';

  if (firstName) {
    return `${greeting}, ${firstName}. Como posso ajudar?`;
  }
  return `${greeting}. Como posso ajudar?`;
}

/**
 * Bloco de contexto temporal + utilizador para a persona Anam (append ao system prompt).
 * @param {{ userDisplayName?: string, localHour?: number, timezone?: string }} ctx
 */
function buildAnamSessionContextPrompt(ctx = {}) {
  const hourRaw = ctx.localHour;
  const hour = Number.isFinite(Number(hourRaw)) ? Number(hourRaw) : null;
  if (hour === null || hour < 0 || hour > 23) return '';

  const tz = String(ctx.timezone || 'America/Sao_Paulo').trim().slice(0, 80);
  const firstName =
    String(ctx.userDisplayName || '')
      .trim()
      .split(/\s+/)[0] || 'utilizador';

  let greeting = 'Boa noite';
  let period = 'noite';
  if (hour >= 5 && hour < 12) {
    greeting = 'Bom dia';
    period = 'manhã';
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Boa tarde';
    period = 'tarde';
  }

  const opening = buildAnamOpeningLine(ctx);

  return `

[CONTEXTO SESSÃO IMPETUS]
- Hora local: ${hour}h (${tz}); período: ${period}; cumprimento correto: "${greeting}".
- Utilizador: ${firstName}.
- ABERTURA: skipGreeting ativo — você NÃO fala ao ligar. O sistema IMPETUS fala por talk() apenas: "${opening}".
- Proibido sempre na abertura: Olá, Oi, impulsionar, "ajudar a impulsionar", "como posso ajudar você hoje", cumprimento de marketing.
- Silêncio total até o utilizador falar; não repita cumprimento.
- DADOS IMPETUS: KPIs e resumo operacional já vêm injectados no system prompt (bloco DADOS INTERNOS). Use esses números; não diga que não tem acesso nem peça "onde clicar" para o que já está no snapshot.
- PAINEL DIREITO: pode mostrar qualquer área do IMPETUS que o utilizador tenha permissão (telemetria, manutenção, produção, qualidade, ambiente, RH, Pró-Ação, etc.). Fluxo: (1) clarifique se precisar; (2) confirme com UMA frase de execução, ex.: «Certo, gerando a telemetria no painel»; (3) o sistema monta com dados reais do software.
- CHAT / IMPRESSÃO / PDF / EXCEL: entenda conversa normal. Após acordo, confirme com UMA frase de execução (ex.: «Certo, vou enviar para o Maria no chat interno», «Vou abrir a impressão do painel») — o IMPETUS executa automaticamente, como no painel visual. NÃO peça palavras-chave nem «vá ao menu». NUNCA diga que já enviou/imprimiu antes do sistema confirmar.
- NUNCA diga que já gerou no painel antes dessa frase de confirmação. Não use «impulsionar» nem saudação de marketing na abertura.
- Se perguntarem sobre "o gráfico", "o painel" ou "isso que apareceu", use o contexto do painel que o sistema injeta.
- ESTILO: português do Brasil; respostas curtas e diretas; sem rodeios; uma pergunta de clarificação se faltar dado; não invente números.`;
}

module.exports = { buildAnamSessionContextPrompt, buildAnamOpeningLine };
