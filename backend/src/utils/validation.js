/**
 * SCHEMAS DE VALIDAÇÃO - FASE 3
 * Validação centralizada com Zod para rotas críticas
 */

const { z } = require('zod');
const { validatePassword } = require('./security');

// ============================================================================
// AUTENTICAÇÃO
// ============================================================================

const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido').max(255)
    .transform(s => s.trim().toLowerCase()),
  password: z.string().min(1, 'Senha é obrigatória').max(128)
});

const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100)
    .transform(s => s.trim()),
  email: z.string().email('Email inválido').max(255)
    .transform(s => s.trim().toLowerCase()),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128)
    .refine(p => validatePassword(p).valid, p => ({ message: validatePassword(p).message })),
  phone: z.string().max(20).optional(),
  whatsapp_number: z.string().max(20).optional(),
  company_id: z.string().uuid('ID da empresa inválido'),
  department_id: z.string().uuid().optional().nullable(),
  role: z.enum(['colaborador', 'supervisor', 'coordenador', 'gerente', 'diretor', 'ceo']).default('colaborador'),
  hierarchy_level: z.coerce.number().int().min(0).max(5).default(5),
  lgpd_consent: z.literal(true, { errorMap: () => ({ message: 'É necessário aceitar os termos LGPD' }) })
});

// ============================================================================
// RESET DE SENHA
// ============================================================================

const resetPasswordSchema = z.object({
  new_password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128)
    .refine(p => validatePassword(p).valid, p => ({ message: validatePassword(p).message }))
});

// ============================================================================
// MIDDLEWARE DE VALIDAÇÃO
// ============================================================================

/**
 * Middleware que valida req.body contra schema Zod
 * Deve ser usado após body-parser
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const details = err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }));
        return res.status(400).json({
          ok: false,
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details
        });
      }
      next(err);
    }
  };
}

/**
 * Valida req.query
 */
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const details = err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }));
        return res.status(400).json({
          ok: false,
          error: 'Parâmetros inválidos',
          code: 'VALIDATION_ERROR',
          details
        });
      }
      next(err);
    }
  };
}

module.exports = {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  validate,
  validateQuery
};
