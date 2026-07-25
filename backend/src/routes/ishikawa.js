'use strict';

/**
 * GF-016 — Ishikawa operational API (domínio; sem cognitivo).
 */
const express = require('express');
const router = express.Router();
const investigationService = require('../domains/ishikawa/services/ishikawaInvestigationService');
const fishboneService = require('../domains/ishikawa/services/ishikawaFishboneService');
const { ISHIKAWA_WORKFLOW_ACTION } = require('../domains/ishikawa/workflow/ishikawaWorkflowEngine');
const {
  ISHIKAWA_INVESTIGATION_STATUS_LIST,
  ISHIKAWA_WORKFLOW_STAGE_LIST
} = require('../domains/ishikawa/semantics/ishikawaCoreSemantics');
const { ISHIKAWA_CATEGORY_KEYS } = require('../domains/ishikawa/core/ishikawaRootCauseAlgorithms');

function canAccessIshikawa(user) {
  const role = (user.role || '').toLowerCase();
  const fa = (user.functional_area || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  return (
    ['quality', 'qualidade', 'eixo_qualidade'].includes(fa) ||
    ['gerente', 'diretor', 'ceo', 'admin'].includes(role) ||
    h <= 3
  );
}

function requireIshikawaAccess(req, res, next) {
  if (!req.user?.company_id) {
    return res.status(400).json({ ok: false, error: 'company_required' });
  }
  if (!canAccessIshikawa(req.user)) {
    return res.status(403).json({ ok: false, error: 'ishikawa_access_denied' });
  }
  next();
}

function workflowHandler(action) {
  return async (req, res) => {
    try {
      const row = await investigationService.runWorkflowAction(req.user.company_id, req.params.id, action, {
        userId: req.user.id,
        notes: req.body?.notes,
        rejection_reason: req.body?.rejection_reason,
        root_cause_summary: req.body?.root_cause_summary
      });
      res.json({ ok: true, investigation: row });
    } catch (err) {
      console.error(`[ishikawa/${action}]`, err?.message || err);
      res.status(400).json({ ok: false, error: err.message || 'bad_request' });
    }
  };
}

router.use(requireIshikawaAccess);

router.get('/semantics', (_req, res) => {
  res.json({
    ok: true,
    investigation_statuses: ISHIKAWA_INVESTIGATION_STATUS_LIST,
    workflow_stages: ISHIKAWA_WORKFLOW_STAGE_LIST,
    fishbone_categories: ISHIKAWA_CATEGORY_KEYS,
    workflow_actions: Object.values(ISHIKAWA_WORKFLOW_ACTION)
  });
});

router.get('/investigations', async (req, res) => {
  try {
    const rows = await investigationService.listInvestigations(req.user.company_id, {
      status: req.query.status,
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0
    });
    res.json({ ok: true, investigations: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.get('/investigations/:id', async (req, res) => {
  try {
    const detail = await investigationService.getInvestigationDetail(req.user.company_id, req.params.id);
    if (!detail) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, ...detail });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.post('/investigations', async (req, res) => {
  try {
    const row = await investigationService.createInvestigation(req.user.company_id, req.body || {}, req.user.id);
    res.status(201).json({ ok: true, investigation: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.put('/investigations/:id', async (req, res) => {
  try {
    const row = await investigationService.updateInvestigation(
      req.user.company_id,
      req.params.id,
      req.body || {},
      req.user.id
    );
    res.json({ ok: true, investigation: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/investigations/:id/start', workflowHandler(ISHIKAWA_WORKFLOW_ACTION.START));
router.post('/investigations/:id/define-root-cause', workflowHandler(ISHIKAWA_WORKFLOW_ACTION.DEFINE_ROOT_CAUSE));
router.post('/investigations/:id/plan-actions', workflowHandler(ISHIKAWA_WORKFLOW_ACTION.PLAN_ACTIONS));
router.post('/investigations/:id/submit-approval', workflowHandler(ISHIKAWA_WORKFLOW_ACTION.SUBMIT_APPROVAL));
router.post('/investigations/:id/reject', workflowHandler(ISHIKAWA_WORKFLOW_ACTION.REJECT));
router.post('/investigations/:id/reopen', workflowHandler(ISHIKAWA_WORKFLOW_ACTION.REOPEN));
router.post('/investigations/:id/close', workflowHandler(ISHIKAWA_WORKFLOW_ACTION.CLOSE));
router.post('/investigations/:id/archive', workflowHandler(ISHIKAWA_WORKFLOW_ACTION.ARCHIVE));

router.post('/investigations/:id/approve', async (req, res) => {
  try {
    const row = await investigationService.approveInvestigation(req.user.company_id, req.params.id, {
      userId: req.user.id,
      notes: req.body?.notes
    });
    res.json({ ok: true, investigation: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/investigations/:id/causes', async (req, res) => {
  try {
    const row = await fishboneService.addFishboneCause(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, cause: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/investigations/:id/five-whys', async (req, res) => {
  try {
    const row = await fishboneService.createFiveWhyAnalysis(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, five_why: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/investigations/:id/team', async (req, res) => {
  try {
    const row = await investigationService.addTeamMember(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, team_member: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/investigations/:id/evidence', async (req, res) => {
  try {
    const row = await investigationService.addEvidence(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, evidence: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/investigations/:id/corrective-actions', async (req, res) => {
  try {
    const row = await investigationService.addCorrectiveAction(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, corrective_action: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/investigations/:id/preventive-actions', async (req, res) => {
  try {
    const row = await investigationService.addPreventiveAction(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, preventive_action: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/investigations/:id/verification', async (req, res) => {
  try {
    const row = await investigationService.addVerificationResult(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, verification: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/investigations/:id/documents', async (req, res) => {
  try {
    const row = await investigationService.addAttachedDocument(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, document: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

module.exports = router;
