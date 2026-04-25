'use strict';

/**
 * Deteção heurística de intenção a partir do texto do utilizador (sem LLM).
 */

const GENERIC = () => ({ intent: 'generic', entities: {} });

/**
 * @param {string|null|undefined} message
 * @returns {{ intent: string, entities: Record<string, string> }}
 */
function detectIntent(message) {
  if (message == null || typeof message !== 'string') {
    return GENERIC();
  }
  const text = message.trim();
  if (!text) {
    return GENERIC();
  }

  const lower = text.toLowerCase();
  const norm = lower
    .replace(/ã/g, 'a')
    .replace(/á|à|â/g, 'a')
    .replace(/é|ê/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó|ô/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ç/g, 'c');

  const entities = {};

  const hasUserRole =
    lower.includes('cargo') ||
    lower.includes('função') ||
    norm.includes('funcao');
  const hasMachine =
    lower.includes('máquina') ||
    lower.includes('maquina') ||
    norm.includes('maquina') ||
    lower.includes('equipamento') ||
    norm.includes('equipamento');
  const hasProduct =
    lower.includes('produto') ||
    norm.includes('produto') ||
    lower.includes('bloqueio') ||
    norm.includes('bloqueio');

  if (hasUserRole) {
    const mDe = text.match(/\b(?:de|do|da)\s+([A-Za-zÀ-ÿ]{2,}(?:\s+[A-Za-zÀ-ÿ]+)?)/i);
    if (mDe) {
      entities.person_name = mDe[1].trim();
    }
    return { intent: 'get_user_role', entities };
  }

  const broadOperationalOverview =
    lower.includes('situação') ||
    norm.includes('situacao') ||
    lower.includes('operação') ||
    norm.includes('operacao') ||
    lower.includes('status geral') ||
    lower.includes('o que está acontecendo') ||
    norm.includes('o que esta acontecendo');

  if (broadOperationalOverview) {
    return { intent: 'operational_overview', entities: {} };
  }

  if (hasMachine) {
    const mTag = text.match(
      /\b(?:máquina|maquina|equipamento)\s*[:\s#-]*\s*([A-Za-z0-9][A-Za-z0-9._-]*)/i
    );
    if (mTag) {
      entities.machine_id = mTag[1].trim();
    }
    return { intent: 'get_machine_status', entities };
  }

  if (hasProduct) {
    const mProd = text.match(/\bproduto\s*[:\s#-]*\s*(\S+)/i);
    if (mProd) {
      entities.product = mProd[1].replace(/[,;.]$/, '');
    }
    const mBloc = text.match(/\bbloqueio\s+(?:de|do|da)?\s*(\S+)/i);
    if (mBloc && !entities.product) {
      entities.product = mBloc[1].replace(/[,;.]$/, '');
    }
    return { intent: 'get_product_status', entities };
  }

  return GENERIC();
}

module.exports = {
  detectIntent
};
