'use strict';

/**
 * GF-002 + GF-005 — PPAP operational API (domínio; sem cognitivo).
 */
const express = require('express');
const router = express.Router();
const submissionService = require('../domains/ppap/services/ppapSubmissionService');
const evidenceService = require('../domains/ppap/services/ppapEvidenceService');
const { PPAP_WORKFLOW_ACTION } = require('../domains/ppap/workflow/ppapWorkflowEngine');
const { PPAP_SUBMISSION_STATUS_LIST } = require('../domains/ppap/semantics/ppapCoreSemantics');

function canAccessPpap(user) {
  const role = (user.role || '').toLowerCase();
  const fa = (user.functional_area || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  return (
    ['quality', 'qualidade', 'engineering', 'engenharia'].includes(fa) ||
    ['gerente', 'diretor', 'ceo', 'admin'].includes(role) ||
    h <= 3
  );
}

function requirePpapAccess(req, res, next) {
  if (!req.user?.company_id) {
    return res.status(400).json({ ok: false, error: 'company_required' });
  }
  if (!canAccessPpap(req.user)) {
    return res.status(403).json({ ok: false, error: 'ppap_access_denied' });
  }
  next();
}

function workflowHandler(action) {
  return async (req, res) => {
    try {
      const row = await submissionService.runWorkflowAction(req.user.company_id, req.params.id, action, {
        userId: req.user.id,
        notes: req.body?.notes,
        rejection_reason: req.body?.rejection_reason
      });
      res.json({ ok: true, submission: row });
    } catch (err) {
      console.error(`[ppap/${action}]`, err?.message || err);
      res.status(400).json({ ok: false, error: err.message || 'bad_request' });
    }
  };
}

router.use(requirePpapAccess);

router.get('/parts', async (req, res) => {
  try {
    const rows = await evidenceService.listParts(req.user.company_id, {
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0
    });
    res.json({ ok: true, parts: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.post('/parts', async (req, res) => {
  try {
    const row = await submissionService.createPart(req.user.company_id, req.body || {});
    res.status(201).json({ ok: true, part: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.get('/suppliers', async (req, res) => {
  try {
    const rows = await evidenceService.listSuppliers(req.user.company_id, {
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0
    });
    res.json({ ok: true, suppliers: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.post('/suppliers', async (req, res) => {
  try {
    const row = await submissionService.createSupplier(req.user.company_id, req.body || {});
    res.status(201).json({ ok: true, supplier: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const rows = await evidenceService.listCustomers(req.user.company_id, {
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0
    });
    res.json({ ok: true, customers: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const row = await submissionService.createCustomer(req.user.company_id, req.body || {});
    res.status(201).json({ ok: true, customer: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.get('/submissions', async (req, res) => {
  try {
    const rows = await submissionService.listSubmissions(req.user.company_id, {
      status: req.query.status,
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0
    });
    res.json({ ok: true, submissions: rows, meta: { status_filter: req.query.status || null } });
  } catch (err) {
    console.error('[ppap/submissions GET]', err?.message || err);
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.get('/submissions/:id', async (req, res) => {
  try {
    const detail = await submissionService.getSubmissionDetail(req.user.company_id, req.params.id);
    if (!detail) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, ...detail });
  } catch (err) {
    console.error('[ppap/submissions/:id GET]', err?.message || err);
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

router.post('/submissions', async (req, res) => {
  try {
    const row = await submissionService.createSubmission(req.user.company_id, req.body || {}, req.user.id);
    res.status(201).json({ ok: true, submission: row });
  } catch (err) {
    console.error('[ppap/submissions POST]', err?.message || err);
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.put('/submissions/:id', async (req, res) => {
  try {
    const row = await submissionService.updateSubmission(
      req.user.company_id,
      req.params.id,
      req.body || {},
      req.user.id
    );
    res.json({ ok: true, submission: row });
  } catch (err) {
    const code = err.message === 'submission not found' ? 404 : 400;
    res.status(code).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/submissions/:id/submit', workflowHandler(PPAP_WORKFLOW_ACTION.SUBMIT));
router.post('/submissions/:id/advance-technical', workflowHandler(PPAP_WORKFLOW_ACTION.ADVANCE_TECHNICAL));
router.post('/submissions/:id/advance-quality', workflowHandler(PPAP_WORKFLOW_ACTION.ADVANCE_QUALITY));
router.post('/submissions/:id/request-approval', workflowHandler(PPAP_WORKFLOW_ACTION.REQUEST_APPROVAL));
router.post('/submissions/:id/resubmit', workflowHandler(PPAP_WORKFLOW_ACTION.RESUBMIT));

router.post('/submissions/:id/approve', async (req, res) => {
  try {
    let row = await submissionService.getSubmissionById(req.user.company_id, req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    if (row.workflow_stage === 'QUALITY_REVIEW') {
      row = await submissionService.runWorkflowAction(
        req.user.company_id,
        req.params.id,
        PPAP_WORKFLOW_ACTION.REQUEST_APPROVAL,
        { userId: req.user.id, notes: req.body?.notes }
      );
    }

    row = await submissionService.runWorkflowAction(
      req.user.company_id,
      req.params.id,
      PPAP_WORKFLOW_ACTION.APPROVE,
      { userId: req.user.id, notes: req.body?.notes }
    );
    res.json({ ok: true, submission: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/submissions/:id/reject', workflowHandler(PPAP_WORKFLOW_ACTION.REJECT));

router.post('/submissions/:id/psw', async (req, res) => {
  try {
    const row = await evidenceService.upsertPsw(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, psw: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/submissions/:id/dimensional-results', async (req, res) => {
  try {
    const row = await evidenceService.addDimensionalResult(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, dimensional_result: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/submissions/:id/material-certifications', async (req, res) => {
  try {
    const row = await evidenceService.addMaterialCertification(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, material_certification: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/submissions/:id/capability-studies', async (req, res) => {
  try {
    const row = await evidenceService.addCapabilityStudy(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, capability_study: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/submissions/:id/appearance-approvals', async (req, res) => {
  try {
    const row = await evidenceService.addAppearanceApproval(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, appearance_approval: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/submissions/:id/performance-tests', async (req, res) => {
  try {
    const row = await evidenceService.addPerformanceTest(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, performance_test: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/submissions/:id/engineering-changes', async (req, res) => {
  try {
    const row = await evidenceService.addEngineeringChange(req.user.company_id, req.params.id, req.body || {});
    res.status(201).json({ ok: true, engineering_change: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.post('/submissions/:id/documents', async (req, res) => {
  try {
    const body = { ...(req.body || {}), uploaded_by: req.user.id };
    const row = await evidenceService.addAttachedDocument(req.user.company_id, req.params.id, body);
    res.status(201).json({ ok: true, document: row });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'bad_request' });
  }
});

router.get('/semantics', (_req, res) => {
  res.json({
    ok: true,
    statuses: PPAP_SUBMISSION_STATUS_LIST,
    workflow_actions: Object.values(PPAP_WORKFLOW_ACTION)
  });
});

module.exports = router;
