'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../config/sz4FeatureFlags');
const obsPolicy = require('../config/sz4ObservationPolicy');
const hitlPolicies = require('../config/sz4HitlPolicies');
const store = require('./sz4TenantStore');
const nlp = require('./sz4EntityExtractor');

let _ingestion = null;
let _taskOrchestrator = null;
let _sz2Facade = null;

function _loadDeps() {
  if (!_ingestion) {
    try { _ingestion = require('../../services/operational/unifiedOperationalIngestionService'); } catch (_) {}
  }
  if (!_taskOrchestrator) {
    try { _taskOrchestrator = require('../../services/operational/cognitiveTaskOrchestrator'); } catch (_) {}
  }
  if (!_sz2Facade) {
    try { _sz2Facade = require('../../runtime-z-cognitive-os/facade/zCognitiveOperatingSystemFacade'); } catch (_) {}
  }
}

function resolveStageForTenant(tenantId) {
  const promoted = flags.promotedTenants();
  if (tenantId && promoted.includes(String(tenantId))) {
    return {
      stage: flags.promotedTenantStage(),
      tenant_promoted: true,
      auto_promotion: false
    };
  }
  return { stage: flags.defaultStage(), tenant_promoted: false, auto_promotion: false };
}

function buildPersistentTaskRecord(input, fused, workflow) {
  const deadlineIso = nlp.parseDeadline(
    fused.deadline?.match,
    input.content.match(/\d{1,2}\s*h(?:oras?)?|\d{1,2}:\d{2}/i)?.[0]
  );
  return {
    id: uuidv4(),
    correlation_id: workflow?.correlation_id || uuidv4(),
    thread_id: input.thread_id || input.conversationId || null,
    workflow_id: workflow?.id || null,
    actor_id: input.user?.id || null,
    requester_id: input.user?.id || null,
    owner_id: input.assignee_id || input.user?.id || null,
    title: (fused.task?.match || fused.report?.match || input.content || 'Tarefa operacional').slice(0, 200),
    description: String(input.content || '').slice(0, 2000),
    deadline: deadlineIso,
    sla_hours: deadlineIso ? Math.max(1, (new Date(deadlineIso) - Date.now()) / 3600000) : null,
    criticidade: nlp.classifyPriority(fused),
    operational_priority: nlp.classifyPriority(fused),
    continuity_state: 'active',
    completion_state: 'open',
    reminder_policy: { advance_minutes: parseInt(process.env.IMPETUS_TASK_REMINDER_ADVANCE_MIN || '70', 10) },
    escalation_policy: { max_depth: 3, assistive_only: true },
    context: {
      source_type: input.sourceType,
      intent: nlp.inferIntent(fused, input.content),
      entities: fused
    },
    approval_required: true,
    auto_execution: false,
    db_task_id: null,
    prepared_only: true
  };
}

function buildWorkflowRecord(input, fused, threadCtx) {
  const correlationId = threadCtx?.correlation_id || uuidv4();
  return {
    id: uuidv4(),
    correlation_id: correlationId,
    thread_id: input.thread_id || input.conversationId || null,
    tenant_id: input.companyId,
    title: (fused.task?.match || fused.report?.match || 'Workflow operacional').slice(0, 160),
    state: 'active',
    continuity_state: 'continued',
    requester_id: threadCtx?.requester_id || input.user?.id || null,
    owner_id: input.assignee_id || threadCtx?.owner_id || null,
    deadline: nlp.parseDeadline(fused.deadline?.match, input.content.match(/\d{1,2}\s*h(?:oras?)?|\d{1,2}:\d{2}/i)?.[0]),
    criticidade: nlp.classifyPriority(fused),
    entities: fused,
    messages_count: (threadCtx?.messages?.length || 0) + 1,
    closure_state: 'open',
    assistive_only: true
  };
}

function detectAwarenessSignals(threadCtx = {}, fused = {}, now = Date.now()) {
  const signals = [];
  const lastAt = threadCtx?.last_message_at ? new Date(threadCtx.last_message_at).getTime() : now;
  const silenceMs = now - lastAt;
  if (silenceMs > 6 * 3600000 && threadCtx?.workflow_open) {
    signals.push({ type: 'SILENCE_DETECTED', severity: 'medium', silence_hours: (silenceMs / 3600000).toFixed(1) });
  }
  if (fused.deadline && threadCtx?.deadline) {
    const due = new Date(threadCtx.deadline).getTime();
    if (due < now) signals.push({ type: 'DELAY_DETECTED', severity: 'high' });
    else if (due - now < 2 * 3600000) signals.push({ type: 'DELAY_DETECTED', severity: 'medium', upcoming: true });
  }
  if (threadCtx?.workflow_open && fused.pending?.detected) {
    signals.push({ type: 'WORKFLOW_INTERRUPTED', severity: 'medium' });
  }
  if (fused.urgent?.detected) {
    signals.push({ type: 'OPERATIONAL_RISK_INFERRED', severity: 'high' });
  }
  if (nlp.classifyPriority(fused) === 'critica') {
    signals.push({ type: 'EXECUTIVE_RELEVANCE_DETECTED', severity: 'high', assistive_only: true });
  }
  return signals;
}

function buildPreparedActions(task, workflow, awarenessSignals = []) {
  const actions = [];
  if (task) {
    actions.push(hitlPolicies.buildHitlEnvelope({
      type: 'task_persist',
      summary: task.title,
      content: task.description
    }));
  }
  if (workflow && awarenessSignals.some((s) => s.type === 'DELAY_DETECTED')) {
    actions.push(hitlPolicies.buildHitlEnvelope({
      type: 'escalation',
      summary: `Escalonamento assistivo sugerido: ${workflow.title}`
    }));
  }
  return actions.map((a) => ({ ...a, prepared_only: true, auto_execution: false }));
}

async function maybePersistDbTask(task, stage, companyId, userId) {
  if (!flags.isStageAtLeast(stage, 'SZ4_TASK_RUNTIME_ACTIVE')) {
    return { persisted: false, reason: 'stage_shadow' };
  }
  if (!_taskOrchestrator || !_taskOrchestrator.isEnabled()) {
    return { persisted: false, reason: 'orchestrator_disabled' };
  }
  const hitl = hitlPolicies.buildHitlEnvelope({ type: 'task_persist', summary: task.title });
  if (hitl.hitl_required) {
    store.recordEvent('HUMAN_VALIDATION_REQUIRED', { tenant_id: companyId, task_id: task.id });
    return { persisted: false, reason: 'hitl_required', hitl };
  }
  const out = await _taskOrchestrator.createTaskFromConversation({
    companyId,
    userId,
    content: task.description,
    title: task.title,
    assignee: null,
    scheduledAt: task.deadline,
    sourceType: task.context?.source_type || 'chat_interno',
    sourceId: task.thread_id,
    priority: task.criticidade === 'critica' ? 'critica' : 'normal'
  });
  return { persisted: out?.ok === true, db_task_id: out?.taskId || null, hitl };
}

async function processOperationalSignal(input = {}) {
  if (!flags.isEnabled()) return { skipped: true, reason: 'sz4_disabled' };

  const companyId = input.companyId || input.user?.company_id;
  const content = String(input.content || '').trim();
  const threadId = input.thread_id || input.conversationId || null;
  const stageInfo = resolveStageForTenant(companyId);
  const stage = stageInfo.stage;

  _loadDeps();

  const observationDecision = obsPolicy.shouldObserveMessage(content, {
    conversationId: threadId,
    sourceType: input.sourceType,
    force_observe: input.force_observe
  });

  if (!observationDecision.observe) {
    return { ok: true, skipped: true, reason: observationDecision.reason, stage: stageInfo.stage };
  }

  const budget = store.consumeObservationBudget(companyId);
  if (!budget.allowed) {
    return { ok: true, skipped: true, reason: 'observation_budget_exhausted', stage };
  }

  const entities = nlp.extractEntities(content);
  const prevThread = threadId ? store.getThreadContext(companyId, threadId) : null;
  const fused = nlp.fuseThreadEntities(prevThread || {}, entities);
  const intent = nlp.inferIntent(entities, content);

  if (intent === 'commitment' && prevThread?.requester_id) {
    input.assignee_id = input.user?.id || input.assignee_id;
  }
  if ((intent === 'task_request' || fused.task?.detected) && input.user?.id) {
    if (!prevThread?.requester_id) input.requester_id = input.user.id;
  }

  const threadCtx = store.upsertThreadContext(companyId, threadId || 'global', {
    correlation_id: prevThread?.correlation_id || uuidv4(),
    requester_id: prevThread?.requester_id || input.requester_id || (intent === 'task_request' ? input.user?.id : null),
    owner_id: intent === 'commitment' ? input.user?.id : prevThread?.owner_id || null,
    deadline: nlp.parseDeadline(fused.deadline?.match, content.match(/\d{1,2}\s*h(?:oras?)?|\d{1,2}:\d{2}/i)?.[0]) || prevThread?.deadline || null,
    workflow_open: !!(fused.task || fused.report || fused.commitment || prevThread?.workflow_open),
    entities: fused,
    last_message_at: new Date().toISOString(),
    messages: [{
      at: new Date().toISOString(),
      sender_id: input.user?.id,
      sender_name: input.user?.name,
      intent,
      excerpt: content.slice(0, 280)
    }]
  });

  let workflow = null;
  let task = null;
  let reminder = null;

  if (flags.isStageAtLeast(stage, 'SZ4_CONTINUITY_ACTIVE') && (fused.task || fused.report || fused.commitment)) {
    workflow = store.saveWorkflow(companyId, buildWorkflowRecord(input, fused, threadCtx));
    store.recordEvent('WORKFLOW_CONTINUED', { tenant_id: companyId, workflow_id: workflow.id, thread_id: threadId });
  }

  if (flags.isStageAtLeast(stage, 'SZ4_TASK_RUNTIME_ACTIVE') && (fused.task || fused.report || fused.commitment)) {
    task = store.saveTask(companyId, buildPersistentTaskRecord(input, fused, workflow));
    store.recordEvent('TASK_REINTEGRATED', { tenant_id: companyId, task_id: task.id, thread_id: threadId });

    const persist = await maybePersistDbTask(task, stage, companyId, input.user?.id);
    if (persist.db_task_id) {
      task.db_task_id = persist.db_task_id;
      task.prepared_only = false;
      store.saveTask(companyId, task);
    } else if (persist.reason === 'hitl_required') {
      store.recordEvent('HUMAN_VALIDATION_REQUIRED', { tenant_id: companyId, task_id: task.id });
    }

    if (task.deadline) {
      reminder = store.saveReminder(companyId, {
        id: uuidv4(),
        task_id: task.id,
        workflow_id: workflow?.id,
        thread_id: threadId,
        title: task.title,
        scheduled_at: task.deadline,
        owner_id: task.owner_id,
        requester_id: task.requester_id,
        status: 'scheduled',
        thread_reintegration_pending: flags.isStageAtLeast(stage, 'SZ4_REINTEGRATION_ACTIVE'),
        assistive_only: true
      });
      store.recordEvent('REMINDER_CONTEXTUALIZED', { tenant_id: companyId, reminder_id: reminder.id, thread_id: threadId });
    }
  }

  const awarenessSignals = flags.isAwarenessEnabled()
    ? detectAwarenessSignals(threadCtx, fused)
    : [];

  for (const sig of awarenessSignals) {
    store.recordEvent(sig.type, { tenant_id: companyId, thread_id: threadId, severity: sig.severity });
  }

  const preparedActions = buildPreparedActions(task, workflow, awarenessSignals);

  if (_ingestion?.isEnabled?.()) {
    _ingestion.ingest({
      content,
      companyId,
      sourceType: input.sourceType || 'chat_interno',
      sourceId: threadId,
      userId: input.user?.id,
      metadata: { sz4: true, intent, entities: fused, stage }
    });
  }

  let sz2Context = null;
  if (_sz2Facade) {
    try {
      sz2Context = _sz2Facade.applyCognitiveOperatingSystem(input.user || {}, {}, {
        tenant_id: companyId,
        message: content,
        legacyHints: { sz4_thread_id: threadId }
      });
    } catch (_) {}
  }

  store.bumpMetric(companyId, 'pipeline_runs', 1);
  if (workflow) store.bumpMetric(companyId, 'workflows_active', 1);
  if (task) store.bumpMetric(companyId, 'tasks_prepared', 1);
  if (reminder) store.bumpMetric(companyId, 'reminders_scheduled', 1);

  const pipelineResult = {
    ok: true,
    stage: stageInfo.stage,
    tenant_promoted: stageInfo.tenant_promoted,
    observation: observationDecision,
    intent,
    entities: fused,
    continuity: {
      thread_id: threadId,
      correlation_id: threadCtx.correlation_id,
      requester_id: threadCtx.requester_id,
      owner_id: threadCtx.owner_id,
      deadline: threadCtx.deadline,
      continuation_score: Object.keys(fused).length > 0 ? 0.85 : 0.35
    },
    workflow,
    task,
    reminder,
    awareness: { signals: awarenessSignals },
    prepared_actions: preparedActions,
    sz2_context: sz2Context?.payload?.runtime_z_cognitive_os || null,
    assistive_only: true,
    auto_execution: false,
    approval_required: true
  };

  try {
    const persistence = require('../persistence/sz4PersistenceRuntime');
    persistence.persistPipelineOutcome(companyId, pipelineResult);
  } catch (_) { /* never block pipeline */ }

  return pipelineResult;
}

module.exports = {
  resolveStageForTenant,
  processOperationalSignal,
  buildPersistentTaskRecord,
  buildWorkflowRecord,
  detectAwarenessSignals
};
