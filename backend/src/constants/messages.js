/**
 * MENSAGENS CENTRALIZADAS
 * Facilita manutenção, revisão ortográfica e futura internacionalização (i18n).
 */

// --- Autenticação e autorização ---
const AUTH = {
  NOT_AUTHENTICATED: 'Não autenticado',
  TOKEN_MISSING: 'Token não fornecido',
  ACCESS_DENIED: 'Acesso negado',
  ACCESS_DENIED_TENANT: 'Acesso negado - recurso de outra empresa',
  ACCESS_DENIED_HIERARCHY: 'Acesso negado - hierarquia insuficiente',
  ACCESS_DENIED_PERMISSION: 'Acesso negado - permissão insuficiente',
  ACCESS_DENIED_COMPANY: 'Acesso negado - empresa diferente',
  ACCESS_DENIED_INTERNAL: 'Acesso restrito à equipe interna',
  NO_PERMISSION: 'Você não possui permissão para acessar este recurso.',
  PERMISSION_INSUFFICIENT: 'Permissão insuficiente',
  SESSION_INVALID: 'Sessão inválida ou expirada'
};

// --- Assinatura e inadimplência ---
const SUBSCRIPTION = {
  OVERDUE_WHATSAPP_DAY5: (diasRestantes) =>
    `⚠️ Impetus Comunica IA\n\nSua assinatura está em atraso há 5 dias. Regularize o pagamento para evitar bloqueio do acesso ao sistema em ${diasRestantes} dias.\n\nDados e histórico estão preservados. Após confirmação do pagamento, o acesso será liberado automaticamente.\n\nDúvidas: entre em contato com nosso financeiro.`
};

// --- Erros comuns ---
const ERRORS = {
  LICENSE_INVALID: 'Licença inválida ou expirada. Entre em contato com o suporte.',
  COMPANY_NOT_FOUND: 'Empresa não encontrada.',
  VALIDATE_COMPANY: 'Erro ao validar empresa',
  PERMISSION_CHECK: 'Erro ao verificar permissões',
  TOO_MANY_REQUESTS: 'Muitas requisições. Aguarde alguns minutos antes de tentar novamente.',
  AUTH_VALIDATION: 'Erro ao validar autenticação'
};

module.exports = {
  AUTH,
  SUBSCRIPTION,
  ERRORS
};
