'use strict';

/**
 * Políticas de acesso a funcionalidades sensíveis (análise autónoma, dados operacionais agregados).
 */

const { isValidUUID } = require('../utils/security');

/**
 * Indica se o utilizador autenticado pode disparar análise autónoma (pré-recolha de contexto operacional).
 * Não substitui autorização por rota — é camada adicional no motor de IA.
 *
 * @param {object|null|undefined} user — req.user típico
 * @returns {boolean}
 */
function allowsAutonomousOperationalAnalysis(user) {
  if (String(process.env.IMPETUS_AUTONOMOUS_RETRIEVAL || '1') === '0') {
    return false;
  }
  if (!user || typeof user !== 'object') {
    return false;
  }
  const uid = user.id != null ? String(user.id).trim() : '';
  const cid = user.company_id != null ? String(user.company_id).trim() : '';
  if (!uid || !cid || !isValidUUID(uid) || !isValidUUID(cid)) {
    return false;
  }
  const st = user.status != null ? String(user.status).toLowerCase() : '';
  if (st === 'inactive' || st === 'disabled' || st === 'suspended') {
    return false;
  }
  return true;
}

module.exports = {
  allowsAutonomousOperationalAnalysis
};
