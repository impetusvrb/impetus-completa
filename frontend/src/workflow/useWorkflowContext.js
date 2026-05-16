/**
 * WAVE 6 — Hook de contexto de workflow.
 * Integra workflowStateManager + canal realtime para actualizações automáticas.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getWorkflows,
  getRunningCount,
  startWorkflow,
  updateWorkflow,
  removeWorkflow,
  subscribeWorkflows
} from './workflowStateManager';
import { useUnifiedRealtime } from '../realtime/useUnifiedRealtime';
import { REALTIME_TOPIC } from '../realtime/realtimeTopics';

/**
 * @returns {{
 *   workflows: WorkflowEntry[],
 *   runningCount: number,
 *   startWorkflow: (params: { id: string, type: string, meta?: unknown }) => void,
 *   completeWorkflow: (id: string, meta?: unknown) => void,
 *   failWorkflow: (id: string, meta?: unknown) => void
 * }}
 */
export function useWorkflowContext() {
  const [workflows, setWorkflows] = useState(() => getWorkflows());
  const { lastMessage } = useUnifiedRealtime(REALTIME_TOPIC.WORKFLOW);

  useEffect(() => {
    const unsub = subscribeWorkflows((wfs) => setWorkflows([...wfs]));
    return unsub;
  }, []);

  // Processa actualizações de workflow vindas do canal realtime.
  useEffect(() => {
    if (!lastMessage) return;
    const { event, data } = lastMessage;
    if (!data) return;
    if (event === 'workflow_update' && data.workflow_id) {
      if (data.status === 'started' || data.status === 'running') {
        startWorkflow({ id: data.workflow_id, type: data.type || 'unknown', meta: data });
      } else if (data.status === 'done') {
        updateWorkflow(data.workflow_id, 'done', data);
      } else if (data.status === 'error') {
        updateWorkflow(data.workflow_id, 'error', data);
      }
    }
  }, [lastMessage]);

  const completeWorkflow = useCallback((id, meta) => updateWorkflow(id, 'done', meta), []);
  const failWorkflow = useCallback((id, meta) => updateWorkflow(id, 'error', meta), []);

  return {
    workflows,
    runningCount: getRunningCount(),
    startWorkflow,
    completeWorkflow,
    failWorkflow,
    removeWorkflow
  };
}
