/**
 * Middleware: exige que o usuário tenha completado identificação (ativação + verificação diária)
 * Usado nas rotas de chat/IA para garantir que a IA saiba com quem fala
 */
const userIdentification = require('../services/userIdentificationService');

async function requireUserVerified(req, res, next) {
  const status = await userIdentification.getIdentificationStatus(req.user);

  if (status.status === 'verified') {
    req.userIdentification = status;
    return next();
  }

  return res.status(403).json({
    ok: false,
    error: 'Identificação pendente. Complete a ativação ou verificação diária.',
    code: 'USER_IDENTIFICATION_REQUIRED',
    identificationStatus: status
  });
}

module.exports = { requireUserVerified };
