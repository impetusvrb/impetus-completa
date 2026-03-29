/** Mensagens padrão para auth e erros (usado por middleware/auth). */
const AUTH = {
  TOKEN_MISSING: 'Token não fornecido',
  SESSION_INVALID: 'Sessão inválida',
  NOT_AUTHENTICATED: 'Não autenticado',
  ACCESS_DENIED_HIERARCHY: 'Acesso negado por hierarquia',
  ACCESS_DENIED_PERMISSION: 'Acesso negado',
  ACCESS_DENIED_COMPANY: 'Acesso negado à empresa',
  ACCESS_DENIED_ROLE: 'Acesso negado: perfil insuficiente',
  COMPANY_REQUIRED: 'Conta sem empresa associada'
};

const ERRORS = {
  AUTH_VALIDATION: 'Erro de validação de autenticação',
  TOO_MANY_REQUESTS: 'Muitas requisições. Aguarde alguns minutos antes de tentar novamente.'
};

module.exports = { AUTH, ERRORS };
