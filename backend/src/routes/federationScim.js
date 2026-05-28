'use strict';

const express = require('express');
const router = express.Router();
const flags = require('../federation/config/federationFlags');
const gov = require('../federation/governance/federationGovernanceService');
const scim = require('../federation/services/scimProvisioningService');
const configSvc = require('../federation/services/federationConfigService');

async function scimAuth(req, res, next) {
  const auth = await scim.validateScimBearer(req.headers.authorization);
  if (!auth.ok) {
    return res.status(401).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: auth.code,
      status: 401,
    });
  }
  req.scim = auth;
  return next();
}

function scimMode(req) {
  return gov.getEffectiveMode(flags.federationMode());
}

router.get('/ServiceProviderConfig', scimAuth, (req, res) => {
  res.json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    patch: { supported: true },
    bulk: { supported: false },
    filter: { supported: false },
    authenticationSchemes: [{ type: 'oauthbearertoken', name: 'Bearer' }],
  });
});

router.get('/Users', scimAuth, async (req, res) => {
  try {
    const startIndex = parseInt(req.query.startIndex || '1', 10);
    const count = parseInt(req.query.count || '100', 10);
    const list = await scim.listUsers(req.scim.company_id, { startIndex, count });
    return res.json(list);
  } catch (e) {
    return res.status(500).json({ detail: e.message, status: 500 });
  }
});

router.get('/Users/:id', scimAuth, async (req, res) => {
  const user = await scim.getUser(req.scim.company_id, req.params.id);
  if (!user) {
    return res.status(404).json({ detail: 'User not found', status: 404 });
  }
  return res.json(user);
});

router.post('/Users', scimAuth, express.json(), async (req, res) => {
  try {
    const mode = scimMode(req);
    const out = await scim.createUser(req.scim.company_id, req.body, mode);
    return res.status(out.status || 201).json(out.user);
  } catch (e) {
    return res.status(400).json({ detail: e.message, status: 400 });
  }
});

router.patch('/Users/:id', scimAuth, express.json(), async (req, res) => {
  try {
    const mode = scimMode(req);
    const ops = req.body.Operations || [];
    let active;
    for (const op of ops) {
      if (op.path === 'active' || op.path?.endsWith(':active')) {
        active = op.value;
      }
    }
    const out = await scim.patchUser(req.scim.company_id, req.params.id, { active }, mode);
    if (!out) return res.status(404).json({ detail: 'Not found', status: 404 });
    return res.json(out.user);
  } catch (e) {
    return res.status(400).json({ detail: e.message, status: 400 });
  }
});

router.delete('/Users/:id', scimAuth, async (req, res) => {
  try {
    const mode = scimMode(req);
    const out = await scim.deactivateUser(req.scim.company_id, req.params.id, mode);
    if (!out) return res.status(404).json({ detail: 'Not found', status: 404 });
    return res.status(204).send();
  } catch (e) {
    return res.status(400).json({ detail: e.message, status: 400 });
  }
});

module.exports = router;
