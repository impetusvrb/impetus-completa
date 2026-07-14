'use strict';

/**
 * Gate de autenticação técnica edge — valida token antes do handler.
 * Marca identidade de serviço via serviceIdentityMarker (module-scoped).
 */
const edgeIngest = require('../../services/edgeIngestService');
const { markValidatedServiceIdentity } = require('../engine/serviceIdentityMarker');
const { runValidatedIdentityReconGuard } = require('./validatedIdentityReconGuard');

async function edgeIngestValidatedGate(req, res, next) {
  try {
    const validation = await edgeIngest.validateEdgeCredentials(req.body);
    if (!validation.ok) {
      return res.status(400).json({ ok: false, error: validation.error || 'Credenciais edge inválidas' });
    }

    req.impetusEdgeValidation = validation;
    markValidatedServiceIdentity(req, {
      source: 'edge_ingest',
      edgeId: validation.edge_id,
      companyId: validation.company_id
    });

    if (!runValidatedIdentityReconGuard(req, res, {
      validationSource: 'edge_ingest',
      identityType: 'EDGE'
    })) {
      return;
    }

    return next();
  } catch (e) {
    console.error('[EDGE_INGEST_GATE]', e?.message || e);
    return res.status(500).json({ ok: false, error: 'Erro ao validar credenciais edge' });
  }
}

module.exports = { edgeIngestValidatedGate };
