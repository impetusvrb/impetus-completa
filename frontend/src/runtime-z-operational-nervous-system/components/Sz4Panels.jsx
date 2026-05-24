import React from 'react';
import PanelShell, { ListBlock, Row, MetricsRows } from './OnsPanelShell';

export default function ZOperationalContinuityPanel({ payload }) {
  return (
    <PanelShell payload={payload} title="Continuidade Operacional" ariaLabel="Continuidade operacional SZ4">
      {(data) => (
        <>
          <Row label="Workflows activos" value={String(data.continuity?.active_workflows ?? 0)} />
          <Row label="Tarefas activas" value={String(data.continuity?.active_tasks ?? 0)} />
          <Row label="Lembretes" value={String(data.continuity?.scheduled_reminders ?? 0)} />
        </>
      )}
    </PanelShell>
  );
}

export function ZWorkflowContinuityPanel({ payload }) {
  return (
    <PanelShell payload={payload} title="Workflows Activos" ariaLabel="Workflows SZ4">
      {(data) => <ListBlock items={data.workflows} emptyLabel="Nenhum workflow contextual activo." />}
    </PanelShell>
  );
}

export function ZPersistentTaskPanel({ payload }) {
  return (
    <PanelShell payload={payload} title="Tarefas Persistentes" ariaLabel="Tarefas persistentes SZ4">
      {(data) => <ListBlock items={data.tasks} emptyLabel="Nenhuma tarefa persistente preparada." />}
    </PanelShell>
  );
}

export function ZConversationalReintegrationPanel({ payload }) {
  return (
    <PanelShell payload={payload} title="Reintegração Conversacional" ariaLabel="Reintegração conversacional SZ4">
      {(data) => (
        <>
          <Row label="Thread-aware" value={data.reintegration?.thread_aware ? 'sim' : 'não'} />
          <Row label="Modo" value={data.reintegration?.assistive_only !== false ? 'assistive · HITL' : '—'} />
        </>
      )}
    </PanelShell>
  );
}

export function ZOperationalAwarenessPanel({ payload }) {
  return (
    <PanelShell payload={payload} title="Awareness Operacional" ariaLabel="Awareness operacional SZ4">
      {(data) => (
        <ListBlock
          items={(data.awareness?.recent_signals || []).map((s, i) => ({ id: s.id || i, title: s.type }))}
          emptyLabel="Sem sinais operacionais recentes."
        />
      )}
    </PanelShell>
  );
}

export function ZReminderContinuityPanel({ payload }) {
  return (
    <PanelShell payload={payload} title="Lembretes Contextuais" ariaLabel="Lembretes SZ4">
      {(data) => <ListBlock items={data.reminders} emptyLabel="Nenhum lembrete contextual agendado." />}
    </PanelShell>
  );
}

export function ZWorkflowEscalationPanel({ payload }) {
  return (
    <PanelShell payload={payload} title="Escalonamento Assistivo" ariaLabel="Escalonamento assistivo SZ4">
      {(data) => (
        <Row label="Política" value="HITL · approval_required · auto_escalation=false" />
      )}
    </PanelShell>
  );
}

export function ZOperationalClosurePanel({ payload }) {
  return (
    <PanelShell payload={payload} title="Fecho Operacional" ariaLabel="Fecho operacional SZ4">
      {(data) => <MetricsRows metrics={data.metrics} />}
    </PanelShell>
  );
}

export function ZSelectiveObservationPanel({ payload }) {
  return (
    <PanelShell payload={payload} title="Observação Selectiva" ariaLabel="Observação selectiva SZ4">
      {(data) => (
        <>
          <Row label="Selectiva" value={data.observation?.selective ? 'sim' : 'não'} />
          <Row label="Budget/h" value={String(data.observation?.budget_per_hour ?? '—')} />
        </>
      )}
    </PanelShell>
  );
}

export function ZHumanValidationPanel({ payload }) {
  return (
    <PanelShell payload={payload} title="Validação Humana" ariaLabel="Validação humana SZ4">
      {(data) => (
        <>
          <Row label="Approval" value={data.governance?.approval_required ? 'obrigatório' : '—'} />
          <Row label="Auto exec" value={data.governance?.auto_execution ? 'sim' : 'não'} />
        </>
      )}
    </PanelShell>
  );
}
