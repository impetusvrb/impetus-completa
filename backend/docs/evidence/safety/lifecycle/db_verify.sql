-- SST lifecycle cert cert-sst-1782078195593
SELECT id, tipo_alerta, titulo FROM operational_alerts WHERE company_id = '511f4819-fc48-479e-b11e-49ba4fb9c81b' AND source = 'safety_operational' ORDER BY created_at DESC LIMIT 5;
SELECT id, alert_type, title FROM hr_alerts WHERE company_id = '511f4819-fc48-479e-b11e-49ba4fb9c81b' AND alert_type = 'treinamento_vencido' ORDER BY created_at DESC LIMIT 3;