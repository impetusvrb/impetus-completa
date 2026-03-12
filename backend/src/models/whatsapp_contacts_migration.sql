-- Contatos WhatsApp da empresa para uso da IA e comunicação
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  sector TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_whatsapp_contacts_company ON whatsapp_contacts(company_id);
CREATE INDEX idx_whatsapp_contacts_department ON whatsapp_contacts(department_id);
