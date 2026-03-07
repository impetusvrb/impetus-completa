/**
 * UTILITÁRIOS DE ERRO - RESPOSTAS PADRONIZADAS
 * Padrão de erro consistente para APIs industriais
 */

/**
 * Classe de erro operacional (erros esperados)
 * Não expõe detalhes internos em produção
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Códigos de erro padronizados
 */
const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT: 'TIMEOUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * Middleware de erro global
 * Trata AppError, ZodError e erros genéricos
 */
function errorHandler(err, req, res, next) {
  // Log em produção com nível adequado
  const isOperational = err.isOperational;
  if (!isOperational) {
    console.error('[APP_ERROR]', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  // AppError (operacional)
  if (err.isOperational && err.statusCode) {
    return res.status(err.statusCode).json({
      ok: false,
      error: err.message,
      code: err.code
    });
  }

  // ZodError (validação)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      ok: false,
      error: 'Dados inválidos',
      code: ErrorCodes.VALIDATION_ERROR,
      details: err.errors?.map(e => ({ path: e.path?.join('.'), message: e.message })) || []
    });
  }

  // JSON malformado (body-parser)
  if (err instanceof SyntaxError) {
    return res.status(400).json({
      ok: false,
      error: 'JSON inválido no corpo da requisição',
      code: ErrorCodes.BAD_REQUEST
    });
  }

  // Erro de conexão/timeout
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return res.status(504).json({
      ok: false,
      error: 'Tempo esgotado. Serviço temporariamente indisponível.',
      code: ErrorCodes.TIMEOUT
    });
  }

  // Padrão: 500
  res.status(500).json({
    ok: false,
    error: 'Erro interno do servidor',
    code: ErrorCodes.INTERNAL_ERROR,
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

/**
 * Wrapper para rotas async - evita try/catch em cada handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ErrorCodes,
  errorHandler,
  asyncHandler
};
