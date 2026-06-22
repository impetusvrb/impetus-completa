-- IECP: acelerar summary/list ambiental em industrial_event_outbox (milhões de linhas domain=environment)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_industrial_outbox_company_domain_created
  ON industrial_event_outbox (company_id, domain, created_at DESC);
