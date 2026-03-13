/**
 * IMPETUS - Integração Manutenção com Inteligência Industrial
 * Cria OS automaticamente quando IA detecta falha recorrente ou crítica
 */
const db = require('../db');

const SEVERITY_CREATE_OS = ['high', 'critical'];
const EVENT_TYPES_CREATE_OS = ['overheating', 'low_oil', 'vibration_alert', 'compressor_offline', 'predicted_failure', 'pressure_low'];

async function maybeCreateWorkOrderFromEvent(event) {
  if (!event?.id || !event?.company_id) return null;
  if (!SEVERITY_CREATE_OS.includes(event.severity)) return null;
  if (!EVENT_TYPES_CREATE_OS.includes(event.event_type)) return null;
  if (event.work_order_created) return null;

  const title = `[IA] ${event.event_type.replace(/_/g, ' ')} - ${event.machine_name || event.machine_identifier}`;
  const description = event.description || `Evento detectado automaticamente: ${event.event_type}. Máquina: ${event.machine_name}`;

  const assignee = await getMaintenanceAssignee(event.company_id);

  const r = await db.query(`
    INSERT INTO work_orders (company_id, title, description, type, machine_name, line_name, priority, status, created_by)
    VALUES ($1, $2, $3, 'predictive', $4, $5, $6, 'open', NULL)
    RETURNING id
  `, [
    event.company_id,
    title.slice(0, 200),
    description,
    event.machine_name || event.machine_identifier,
    event.line_name,
    event.severity === 'critical' ? 'urgent' : 'high'
  ]);

  const woId = r.rows?.[0]?.id;
  if (woId && assignee) {
    await db.query(`UPDATE work_orders SET assigned_to = $2 WHERE id = $1`, [woId, assignee]);
  }

  if (woId) {
    await db.query(`UPDATE machine_detected_events SET work_order_created = $2 WHERE id = $1`, [event.id, woId]);
  }

  return woId;
}

async function getMaintenanceAssignee(companyId) {
  const r = await db.query(`
    SELECT id FROM users
    WHERE company_id = $1 AND active = true
      AND (role ILIKE '%mecanico%' OR role ILIKE '%eletricista%' OR role ILIKE '%eletromecanico%' OR functional_area ILIKE '%manutencao%')
    ORDER BY hierarchy_level ASC
    LIMIT 1
  `, [companyId]);
  return r.rows?.[0]?.id;
}

module.exports = { maybeCreateWorkOrderFromEvent };
