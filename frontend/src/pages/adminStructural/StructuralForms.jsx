/**
 * Formulários completos da Base Estrutural (alinhados ao backend /admin/structural)
 */
import React from 'react';
import { InputField, SelectField, TextAreaField, CheckboxField } from '../../components/FormField';

function splitToArray(val) {
  if (val == null || val === '') return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return String(val)
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function arrToText(val) {
  if (val == null) return '';
  if (Array.isArray(val)) return val.join('\n');
  return String(val);
}

function jsonToText(val) {
  if (val == null || val === '') return '';
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return '';
  }
}

function parseJsonField(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return { raw: t };
  }
}

export function structuralItemToForm(module, item) {
  if (!item) return {};
  const base = {};
  Object.keys(item).forEach((k) => {
    const v = item[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) return;
    if (Array.isArray(v)) {
      if (['verification_items', 'escalation_rules', 'language_by_profile', 'machine_nicknames', 'forbidden_per_profile', 'response_rules_per_profile', 'auto_alert_rules', 'monitoring_triggers'].includes(k)) {
        base[k] = jsonToText(v);
      } else {
        base[k] = arrToText(v);
      }
    } else if (k.includes('_at') || k === 'valid_until' || k === 'installation_date') {
      base[k] = v ? String(v).slice(0, 10) : '';
    } else {
      base[k] = v ?? '';
    }
  });
  if (module === 'communication-rules' && item.sensitive_topic !== undefined) {
    base.sensitive_topic = !!item.sensitive_topic;
  }
  if (module === 'communication-rules' && item) {
    base.escalation_rules = jsonToText(item.escalation_rules);
    base.language_by_profile = jsonToText(item.language_by_profile);
  }
  if (module === 'routines' && item?.verification_items) {
    base.verification_items = jsonToText(item.verification_items);
  }
  if (module === 'ai-config' && item) {
    base.machine_nicknames = jsonToText(item.machine_nicknames);
    base.forbidden_per_profile = jsonToText(item.forbidden_per_profile);
    base.response_rules_per_profile = jsonToText(item.response_rules_per_profile);
    base.auto_alert_rules = jsonToText(item.auto_alert_rules);
    base.monitoring_triggers = jsonToText(item.monitoring_triggers);
  }
  return base;
}

export function structuralSerializePayload(module, form) {
  const num = (x) => {
    const n = parseFloat(x, 10);
    return Number.isFinite(n) ? n : null;
  };
  const intOrNull = (x) => {
    const n = parseInt(x, 10);
    return Number.isFinite(n) ? n : null;
  };
  const uuidOrNull = (x) => (x && String(x).trim() ? String(x).trim() : null);

  const commonArr = (key) => splitToArray(form[key]);

  switch (module) {
    case 'roles':
      return {
        name: form.name || '',
        description: form.description || null,
        hierarchy_level: intOrNull(form.hierarchy_level),
        work_area: form.work_area || null,
        main_responsibilities: commonArr('main_responsibilities'),
        critical_responsibilities: commonArr('critical_responsibilities'),
        recommended_permissions: commonArr('recommended_permissions'),
        sectors_involved: commonArr('sectors_involved'),
        leadership_type: form.leadership_type || null,
        communication_profile: form.communication_profile || null,
        direct_superior_role_id: uuidOrNull(form.direct_superior_role_id),
        expected_subordinates: commonArr('expected_subordinates'),
        decision_level: form.decision_level || null,
        visible_themes: commonArr('visible_themes'),
        hidden_themes: commonArr('hidden_themes'),
        escalation_role: form.escalation_role || null,
        operation_role: form.operation_role || null,
        approval_role: form.approval_role || null,
        notes: form.notes || null
      };
    case 'assets':
      return {
        name: form.name || '',
        code_patrimonial: form.code_patrimonial || null,
        operational_nickname: form.operational_nickname || null,
        asset_category: form.asset_category || null,
        equipment_type: form.equipment_type || null,
        department_id: uuidOrNull(form.department_id),
        line_id: uuidOrNull(form.line_id),
        process_id: uuidOrNull(form.process_id),
        manufacturer: form.manufacturer || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        year: intOrNull(form.year),
        installation_date: form.installation_date || null,
        current_state: form.current_state || null,
        operational_status: form.operational_status || 'active',
        criticality: form.criticality || null,
        main_components: commonArr('main_components'),
        power_source: form.power_source || null,
        recurrent_failures: commonArr('recurrent_failures'),
        frequent_symptoms: commonArr('frequent_symptoms'),
        associated_risks: commonArr('associated_risks'),
        downtime_impact: form.downtime_impact || null,
        technical_responsible_id: uuidOrNull(form.technical_responsible_id),
        notes: form.notes || null
      };
    case 'processes':
      return {
        name: form.name || '',
        category: form.category || null,
        objective: form.objective || null,
        responsible_area_id: uuidOrNull(form.responsible_area_id),
        involved_sectors: commonArr('involved_sectors'),
        process_steps: form.process_steps || null,
        process_inputs: commonArr('process_inputs'),
        process_outputs: commonArr('process_outputs'),
        responsibles: commonArr('responsibles'),
        process_indicators: commonArr('process_indicators'),
        process_risks: commonArr('process_risks'),
        critical_points: commonArr('critical_points'),
        frequency: form.frequency || null,
        related_procedures: commonArr('related_procedures'),
        dependencies: commonArr('dependencies'),
        notes: form.notes || null
      };
    case 'products':
      return {
        name: form.name || '',
        code: form.code || null,
        category: form.category || null,
        description: form.description || null,
        line_id: uuidOrNull(form.line_id),
        main_department_id: uuidOrNull(form.main_department_id),
        process_id: uuidOrNull(form.process_id),
        packaging: form.packaging || null,
        quality_standards: commonArr('quality_standards'),
        critical_requirements: commonArr('critical_requirements'),
        important_specs: commonArr('important_specs'),
        associated_risks: commonArr('associated_risks'),
        avg_production_time: form.avg_production_time || null,
        related_procedures: commonArr('related_procedures'),
        technical_notes: form.technical_notes || null
      };
    case 'indicators':
      return {
        name: form.name || '',
        indicator_type: form.indicator_type || null,
        department_id: uuidOrNull(form.department_id),
        line_id: uuidOrNull(form.line_id),
        process_id: uuidOrNull(form.process_id),
        target_value: form.target_value || null,
        min_acceptable: form.min_acceptable || null,
        max_acceptable: form.max_acceptable || null,
        attention_range: form.attention_range || null,
        critical_range: form.critical_range || null,
        measurement_frequency: form.measurement_frequency || null,
        unit: form.unit || null,
        responsible_id: uuidOrNull(form.responsible_id),
        deviation_action: form.deviation_action || null,
        strategic_weight: num(form.strategic_weight),
        notes: form.notes || null
      };
    case 'failure-risks':
      return {
        name: form.name || '',
        failure_type: form.failure_type || null,
        risk_category: form.risk_category || null,
        department_id: uuidOrNull(form.department_id),
        line_id: uuidOrNull(form.line_id),
        asset_id: uuidOrNull(form.asset_id),
        process_id: uuidOrNull(form.process_id),
        possible_causes: commonArr('possible_causes'),
        common_symptoms: commonArr('common_symptoms'),
        operational_impact: form.operational_impact || null,
        quality_impact: form.quality_impact || null,
        safety_impact: form.safety_impact || null,
        productivity_impact: form.productivity_impact || null,
        criticality_level: form.criticality_level || null,
        expected_frequency: form.expected_frequency || null,
        default_response_plan: form.default_response_plan || null,
        default_responsible_id: uuidOrNull(form.default_responsible_id),
        suggested_escalation: form.suggested_escalation || null,
        notes: form.notes || null
      };
    case 'communication-rules':
      return {
        subject_type: form.subject_type || '',
        priority_level: form.priority_level || null,
        profile_can_view: commonArr('profile_can_view'),
        profile_must_notify: commonArr('profile_must_notify'),
        profile_must_approve: commonArr('profile_must_approve'),
        profile_must_act: commonArr('profile_must_act'),
        notification_hours: form.notification_hours || null,
        preferred_channel: form.preferred_channel || null,
        escalation_rules: parseJsonField(form.escalation_rules),
        max_response_time: form.max_response_time || null,
        max_resolution_time: form.max_resolution_time || null,
        confidentiality_level: form.confidentiality_level || null,
        sensitive_topic: !!form.sensitive_topic,
        language_by_profile: parseJsonField(form.language_by_profile),
        communication_flow: form.communication_flow || null,
        notes: form.notes || null
      };
    case 'routines':
      return {
        name: form.name || '',
        routine_type: form.routine_type || null,
        department_id: uuidOrNull(form.department_id),
        line_id: uuidOrNull(form.line_id),
        asset_id: uuidOrNull(form.asset_id),
        frequency: form.frequency || null,
        expected_time: form.expected_time || null,
        responsible_id: uuidOrNull(form.responsible_id),
        checklist_id: uuidOrNull(form.checklist_id),
        verification_items: parseJsonField(form.verification_items),
        conformity_criteria: commonArr('conformity_criteria'),
        related_procedures: commonArr('related_procedures'),
        non_conformity_action: form.non_conformity_action || null,
        notes: form.notes || null
      };
    case 'shifts':
      return {
        name: form.name || '',
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        active_departments: commonArr('active_departments'),
        active_lines: commonArr('active_lines'),
        main_teams: commonArr('main_teams'),
        shift_responsibles: commonArr('shift_responsibles'),
        shift_leader_id: uuidOrNull(form.shift_leader_id),
        operational_notes: form.operational_notes || null,
        shift_routines: commonArr('shift_routines'),
        common_risks: commonArr('common_risks'),
        special_rules: form.special_rules || null
      };
    case 'area-responsibles':
      return {
        area_name: form.area_name || '',
        area_type: form.area_type || null,
        main_responsible_id: uuidOrNull(form.main_responsible_id),
        substitute_responsible_id: uuidOrNull(form.substitute_responsible_id),
        supervisor_id: uuidOrNull(form.supervisor_id),
        manager_id: uuidOrNull(form.manager_id),
        director_id: uuidOrNull(form.director_id),
        responsible_themes: commonArr('responsible_themes'),
        responsible_assets: commonArr('responsible_assets'),
        responsible_lines: commonArr('responsible_lines'),
        responsible_processes: commonArr('responsible_processes'),
        contact_rules: form.contact_rules || null,
        notes: form.notes || null
      };
    case 'ai-config':
      return {
        config_key: form.config_key || 'default',
        config_type: form.config_type || null,
        internal_terms: splitToArray(form.internal_terms),
        machine_nicknames: parseJsonField(form.machine_nicknames),
        internal_acronyms: commonArr('internal_acronyms'),
        critical_words: commonArr('critical_words'),
        sensitive_words: commonArr('sensitive_words'),
        confidential_themes: commonArr('confidential_themes'),
        priority_themes: commonArr('priority_themes'),
        forbidden_per_profile: parseJsonField(form.forbidden_per_profile),
        response_rules_per_profile: parseJsonField(form.response_rules_per_profile),
        language_preference: form.language_preference || null,
        auto_alert_rules: parseJsonField(form.auto_alert_rules),
        monitoring_triggers: parseJsonField(form.monitoring_triggers),
        escalation_contexts: commonArr('escalation_contexts'),
        discrete_response_contexts: commonArr('discrete_response_contexts'),
        immediate_response_contexts: commonArr('immediate_response_contexts'),
        notes: form.notes || null
      };
    case 'knowledge-docs':
      return {
        title: form.title || '',
        doc_type: form.doc_type || null,
        category: form.category || null,
        summary: form.summary || null,
        department_id: uuidOrNull(form.department_id),
        line_id: uuidOrNull(form.line_id),
        asset_id: uuidOrNull(form.asset_id),
        process_id: uuidOrNull(form.process_id),
        product_id: uuidOrNull(form.product_id),
        version: form.version || null,
        valid_until: form.valid_until || null,
        responsible_id: uuidOrNull(form.responsible_id),
        keywords: commonArr('keywords'),
        confidentiality_level: form.confidentiality_level || null,
        allowed_audience: commonArr('allowed_audience'),
        external_url: form.external_url || null,
        notes: form.notes || null
      };
    default:
      return { ...form };
  }
}

export function StructuralGenericForm({ module, form, refs, onChange }) {
  const deptOpts = (refs?.departments || []).map((d) => ({ value: d.id, label: d.name }));
  const lineOpts = (refs?.productionLines || []).map((l) => ({ value: l.id, label: l.name }));
  const processOpts = (refs?.processes || []).map((p) => ({ value: p.id, label: p.name }));
  const productOpts = (refs?.products || []).map((p) => ({ value: p.id, label: p.name || p.code }));
  const userOpts = (refs?.users || []).map((u) => ({ value: u.id, label: u.name }));
  const assetOpts = (refs?.assets || []).map((a) => ({ value: a.id, label: a.name }));
  const roleOpts = (refs?.roles || []).map((r) => ({ value: r.id, label: r.name }));
  const checklistOpts = (refs?.checklists || []).map((c) => ({ value: c.id, label: c.name }));

  const g = {
    roles: (
      <>
        <h4 className="structural-form-section-title">Identificação</h4>
        <div className="form-grid-2">
          <InputField label="Nome do cargo" name="name" value={form.name} onChange={onChange} required />
          <InputField label="Nível hierárquico" name="hierarchy_level" type="number" value={form.hierarchy_level} onChange={onChange} />
        </div>
        <TextAreaField label="Descrição" name="description" value={form.description} onChange={onChange} rows={2} />
        <InputField label="Área de atuação" name="work_area" value={form.work_area} onChange={onChange} />
        <SelectField label="Superior direto (cargo)" name="direct_superior_role_id" value={form.direct_superior_role_id} onChange={onChange} options={roleOpts} placeholder="Opcional" />
        <h4 className="structural-form-section-title">Responsabilidades e permissões</h4>
        <TextAreaField label="Responsabilidades principais (uma por linha)" name="main_responsibilities" value={form.main_responsibilities} onChange={onChange} rows={3} />
        <TextAreaField label="Responsabilidades críticas" name="critical_responsibilities" value={form.critical_responsibilities} onChange={onChange} rows={2} />
        <TextAreaField label="Permissões recomendadas" name="recommended_permissions" value={form.recommended_permissions} onChange={onChange} rows={2} />
        <TextAreaField label="Setores em que atua" name="sectors_involved" value={form.sectors_involved} onChange={onChange} rows={2} />
        <div className="form-grid-2">
          <InputField label="Tipo de liderança" name="leadership_type" value={form.leadership_type} onChange={onChange} />
          <InputField label="Perfil de comunicação" name="communication_profile" value={form.communication_profile} onChange={onChange} />
        </div>
        <TextAreaField label="Subordinados esperados" name="expected_subordinates" value={form.expected_subordinates} onChange={onChange} rows={2} />
        <InputField label="Nível de tomada de decisão" name="decision_level" value={form.decision_level} onChange={onChange} />
        <TextAreaField label="Temas que pode visualizar" name="visible_themes" value={form.visible_themes} onChange={onChange} rows={2} />
        <TextAreaField label="Temas que não pode visualizar" name="hidden_themes" value={form.hidden_themes} onChange={onChange} rows={2} />
        <TextAreaField label="Papel na escalada" name="escalation_role" value={form.escalation_role} onChange={onChange} rows={2} />
        <div className="form-grid-2">
          <TextAreaField label="Papel na operação" name="operation_role" value={form.operation_role} onChange={onChange} rows={2} />
          <TextAreaField label="Papel na aprovação" name="approval_role" value={form.approval_role} onChange={onChange} rows={2} />
        </div>
        <TextAreaField label="Observações" name="notes" value={form.notes} onChange={onChange} rows={2} />
      </>
    ),
    assets: (
      <>
        <div className="form-grid-2">
          <InputField label="Nome do ativo" name="name" value={form.name} onChange={onChange} required />
          <InputField label="Código / tag patrimonial" name="code_patrimonial" value={form.code_patrimonial} onChange={onChange} />
        </div>
        <div className="form-grid-2">
          <InputField label="Apelido operacional" name="operational_nickname" value={form.operational_nickname} onChange={onChange} />
          <InputField label="Categoria" name="asset_category" value={form.asset_category} onChange={onChange} />
        </div>
        <InputField label="Tipo de equipamento" name="equipment_type" value={form.equipment_type} onChange={onChange} />
        <div className="form-grid-3">
          <SelectField label="Setor" name="department_id" value={form.department_id} onChange={onChange} options={deptOpts} placeholder="Selecione" />
          <SelectField label="Linha vinculada" name="line_id" value={form.line_id} onChange={onChange} options={lineOpts} placeholder="Opcional" />
          <SelectField label="Processo vinculado" name="process_id" value={form.process_id} onChange={onChange} options={processOpts} placeholder="Opcional" />
        </div>
        <div className="form-grid-3">
          <InputField label="Fabricante" name="manufacturer" value={form.manufacturer} onChange={onChange} />
          <InputField label="Modelo" name="model" value={form.model} onChange={onChange} />
          <InputField label="Nº série" name="serial_number" value={form.serial_number} onChange={onChange} />
        </div>
        <div className="form-grid-3">
          <InputField label="Ano" name="year" type="number" value={form.year} onChange={onChange} />
          <InputField label="Data instalação" name="installation_date" type="date" value={form.installation_date} onChange={onChange} />
          <SelectField label="Status operacional" name="operational_status" value={form.operational_status} onChange={onChange} options={[{ value: 'active', label: 'Ativo' }, { value: 'inactive', label: 'Inativo' }, { value: 'maintenance', label: 'Manutenção' }]} />
        </div>
        <div className="form-grid-2">
          <InputField label="Estado atual" name="current_state" value={form.current_state} onChange={onChange} />
          <InputField label="Criticidade" name="criticality" value={form.criticality} onChange={onChange} />
        </div>
        <TextAreaField label="Componentes principais" name="main_components" value={form.main_components} onChange={onChange} rows={2} />
        <InputField label="Fonte de energia" name="power_source" value={form.power_source} onChange={onChange} />
        <TextAreaField label="Falhas recorrentes" name="recurrent_failures" value={form.recurrent_failures} onChange={onChange} rows={2} />
        <TextAreaField label="Sintomas frequentes" name="frequent_symptoms" value={form.frequent_symptoms} onChange={onChange} rows={2} />
        <TextAreaField label="Riscos associados" name="associated_risks" value={form.associated_risks} onChange={onChange} rows={2} />
        <TextAreaField label="Impacto em caso de parada" name="downtime_impact" value={form.downtime_impact} onChange={onChange} rows={2} />
        <SelectField label="Responsável técnico" name="technical_responsible_id" value={form.technical_responsible_id} onChange={onChange} options={userOpts} placeholder="Opcional" />
        <TextAreaField label="Observações (manuais/POPs podem referenciar na Biblioteca)" name="notes" value={form.notes} onChange={onChange} rows={3} />
      </>
    ),
    processes: (
      <>
        <div className="form-grid-2">
          <InputField label="Nome do processo" name="name" value={form.name} onChange={onChange} required />
          <InputField label="Categoria" name="category" value={form.category} onChange={onChange} />
        </div>
        <TextAreaField label="Objetivo" name="objective" value={form.objective} onChange={onChange} rows={2} />
        <SelectField label="Área responsável" name="responsible_area_id" value={form.responsible_area_id} onChange={onChange} options={deptOpts} placeholder="Selecione" />
        <TextAreaField label="Setores envolvidos (um por linha)" name="involved_sectors" value={form.involved_sectors} onChange={onChange} rows={2} />
        <TextAreaField label="Etapas do processo" name="process_steps" value={form.process_steps} onChange={onChange} rows={4} />
        <TextAreaField label="Entradas" name="process_inputs" value={form.process_inputs} onChange={onChange} rows={2} />
        <TextAreaField label="Saídas" name="process_outputs" value={form.process_outputs} onChange={onChange} rows={2} />
        <TextAreaField label="Responsáveis" name="responsibles" value={form.responsibles} onChange={onChange} rows={2} />
        <TextAreaField label="Indicadores" name="process_indicators" value={form.process_indicators} onChange={onChange} rows={2} />
        <TextAreaField label="Riscos" name="process_risks" value={form.process_risks} onChange={onChange} rows={2} />
        <TextAreaField label="Pontos críticos" name="critical_points" value={form.critical_points} onChange={onChange} rows={2} />
        <InputField label="Frequência" name="frequency" value={form.frequency} onChange={onChange} />
        <TextAreaField label="Procedimentos relacionados" name="related_procedures" value={form.related_procedures} onChange={onChange} rows={2} />
        <TextAreaField label="Dependências" name="dependencies" value={form.dependencies} onChange={onChange} rows={2} />
        <TextAreaField label="Observações" name="notes" value={form.notes} onChange={onChange} rows={2} />
      </>
    ),
    products: (
      <>
        <div className="form-grid-2">
          <InputField label="Nome" name="name" value={form.name} onChange={onChange} required />
          <InputField label="Código" name="code" value={form.code} onChange={onChange} />
        </div>
        <InputField label="Categoria" name="category" value={form.category} onChange={onChange} />
        <TextAreaField label="Descrição" name="description" value={form.description} onChange={onChange} rows={2} />
        <div className="form-grid-3">
          <SelectField label="Linha produtiva" name="line_id" value={form.line_id} onChange={onChange} options={lineOpts} placeholder="Opcional" />
          <SelectField label="Setor principal" name="main_department_id" value={form.main_department_id} onChange={onChange} options={deptOpts} placeholder="Opcional" />
          <SelectField label="Processo relacionado" name="process_id" value={form.process_id} onChange={onChange} options={processOpts} placeholder="Opcional" />
        </div>
        <InputField label="Embalagem" name="packaging" value={form.packaging} onChange={onChange} />
        <TextAreaField label="Padrões de qualidade" name="quality_standards" value={form.quality_standards} onChange={onChange} rows={2} />
        <TextAreaField label="Requisitos críticos" name="critical_requirements" value={form.critical_requirements} onChange={onChange} rows={2} />
        <TextAreaField label="Especificações importantes" name="important_specs" value={form.important_specs} onChange={onChange} rows={2} />
        <TextAreaField label="Riscos associados" name="associated_risks" value={form.associated_risks} onChange={onChange} rows={2} />
        <InputField label="Tempo médio de produção" name="avg_production_time" value={form.avg_production_time} onChange={onChange} />
        <TextAreaField label="Procedimentos relacionados" name="related_procedures" value={form.related_procedures} onChange={onChange} rows={2} />
        <TextAreaField label="Observações técnicas" name="technical_notes" value={form.technical_notes} onChange={onChange} rows={3} />
      </>
    ),
    indicators: (
      <>
        <InputField label="Nome do indicador" name="name" value={form.name} onChange={onChange} required />
        <InputField label="Tipo" name="indicator_type" value={form.indicator_type} onChange={onChange} />
        <div className="form-grid-3">
          <SelectField label="Setor" name="department_id" value={form.department_id} onChange={onChange} options={deptOpts} placeholder="Opcional" />
          <SelectField label="Linha" name="line_id" value={form.line_id} onChange={onChange} options={lineOpts} placeholder="Opcional" />
          <SelectField label="Processo" name="process_id" value={form.process_id} onChange={onChange} options={processOpts} placeholder="Opcional" />
        </div>
        <div className="form-grid-2">
          <InputField label="Meta esperada" name="target_value" value={form.target_value} onChange={onChange} />
          <InputField label="Unidade" name="unit" value={form.unit} onChange={onChange} />
        </div>
        <div className="form-grid-2">
          <InputField label="Limite mínimo aceitável" name="min_acceptable" value={form.min_acceptable} onChange={onChange} />
          <InputField label="Limite máximo aceitável" name="max_acceptable" value={form.max_acceptable} onChange={onChange} />
        </div>
        <div className="form-grid-2">
          <InputField label="Faixa de atenção" name="attention_range" value={form.attention_range} onChange={onChange} />
          <InputField label="Faixa crítica" name="critical_range" value={form.critical_range} onChange={onChange} />
        </div>
        <InputField label="Frequência de medição" name="measurement_frequency" value={form.measurement_frequency} onChange={onChange} />
        <SelectField label="Responsável" name="responsible_id" value={form.responsible_id} onChange={onChange} options={userOpts} placeholder="Opcional" />
        <TextAreaField label="Ação em caso de desvio" name="deviation_action" value={form.deviation_action} onChange={onChange} rows={2} />
        <InputField label="Peso estratégico" name="strategic_weight" type="number" step="0.01" value={form.strategic_weight} onChange={onChange} />
        <TextAreaField label="Observações" name="notes" value={form.notes} onChange={onChange} rows={2} />
      </>
    ),
    'failure-risks': (
      <>
        <InputField label="Nome" name="name" value={form.name} onChange={onChange} required />
        <div className="form-grid-2">
          <InputField label="Tipo de falha" name="failure_type" value={form.failure_type} onChange={onChange} />
          <InputField label="Categoria do risco" name="risk_category" value={form.risk_category} onChange={onChange} />
        </div>
        <div className="form-grid-2">
          <SelectField label="Setor" name="department_id" value={form.department_id} onChange={onChange} options={deptOpts} placeholder="Opcional" />
          <SelectField label="Linha" name="line_id" value={form.line_id} onChange={onChange} options={lineOpts} placeholder="Opcional" />
        </div>
        <div className="form-grid-2">
          <SelectField label="Máquina/ativo" name="asset_id" value={form.asset_id} onChange={onChange} options={assetOpts} placeholder="Opcional" />
          <SelectField label="Processo" name="process_id" value={form.process_id} onChange={onChange} options={processOpts} placeholder="Opcional" />
        </div>
        <TextAreaField label="Possíveis causas" name="possible_causes" value={form.possible_causes} onChange={onChange} rows={2} />
        <TextAreaField label="Sintomas comuns" name="common_symptoms" value={form.common_symptoms} onChange={onChange} rows={2} />
        <div className="form-grid-2">
          <TextAreaField label="Impacto operacional" name="operational_impact" value={form.operational_impact} onChange={onChange} rows={2} />
          <TextAreaField label="Impacto na qualidade" name="quality_impact" value={form.quality_impact} onChange={onChange} rows={2} />
        </div>
        <div className="form-grid-2">
          <TextAreaField label="Impacto na segurança" name="safety_impact" value={form.safety_impact} onChange={onChange} rows={2} />
          <TextAreaField label="Impacto na produtividade" name="productivity_impact" value={form.productivity_impact} onChange={onChange} rows={2} />
        </div>
        <div className="form-grid-2">
          <InputField label="Criticidade" name="criticality_level" value={form.criticality_level} onChange={onChange} />
          <InputField label="Frequência esperada" name="expected_frequency" value={form.expected_frequency} onChange={onChange} />
        </div>
        <TextAreaField label="Plano padrão de resposta" name="default_response_plan" value={form.default_response_plan} onChange={onChange} rows={2} />
        <SelectField label="Responsável padrão" name="default_responsible_id" value={form.default_responsible_id} onChange={onChange} options={userOpts} placeholder="Opcional" />
        <TextAreaField label="Escalonamento sugerido" name="suggested_escalation" value={form.suggested_escalation} onChange={onChange} rows={2} />
        <TextAreaField label="Observações" name="notes" value={form.notes} onChange={onChange} rows={2} />
      </>
    ),
    'communication-rules': (
      <>
        <div className="form-grid-2">
          <InputField label="Tipo de assunto" name="subject_type" value={form.subject_type} onChange={onChange} required />
          <InputField label="Prioridade" name="priority_level" value={form.priority_level} onChange={onChange} />
        </div>
        <TextAreaField label="Perfis que podem visualizar (ex.: admin, gerente)" name="profile_can_view" value={form.profile_can_view} onChange={onChange} rows={2} />
        <TextAreaField label="Perfis a notificar" name="profile_must_notify" value={form.profile_must_notify} onChange={onChange} rows={2} />
        <TextAreaField label="Perfis que devem aprovar" name="profile_must_approve" value={form.profile_must_approve} onChange={onChange} rows={2} />
        <TextAreaField label="Perfis que devem agir" name="profile_must_act" value={form.profile_must_act} onChange={onChange} rows={2} />
        <InputField label="Horário permitido de notificação" name="notification_hours" value={form.notification_hours} onChange={onChange} />
        <InputField label="Canal prioritário" name="preferred_channel" value={form.preferred_channel} onChange={onChange} />
        <TextAreaField label="Regras de escalonamento (JSON opcional)" name="escalation_rules" value={form.escalation_rules} onChange={onChange} rows={3} />
        <div className="form-grid-2">
          <InputField label="Tempo máx. resposta" name="max_response_time" value={form.max_response_time} onChange={onChange} />
          <InputField label="Tempo máx. solução" name="max_resolution_time" value={form.max_resolution_time} onChange={onChange} />
        </div>
        <InputField label="Nível de sigilo" name="confidentiality_level" value={form.confidentiality_level} onChange={onChange} />
        <CheckboxField
          label="Tema sensível"
          name="sensitive_topic"
          checked={!!form.sensitive_topic}
          onChange={(e) =>
            onChange({ target: { name: 'sensitive_topic', type: 'checkbox', checked: e.target.checked } })
          }
        />
        <TextAreaField label="Linguagem por perfil (JSON)" name="language_by_profile" value={form.language_by_profile} onChange={onChange} rows={3} />
        <TextAreaField label="Fluxo de comunicação" name="communication_flow" value={form.communication_flow} onChange={onChange} rows={2} />
        <TextAreaField label="Observações" name="notes" value={form.notes} onChange={onChange} rows={2} />
      </>
    ),
    routines: (
      <>
        <InputField label="Nome da rotina" name="name" value={form.name} onChange={onChange} required />
        <div className="form-grid-2">
          <InputField label="Tipo" name="routine_type" value={form.routine_type} onChange={onChange} />
          <InputField label="Frequência" name="frequency" value={form.frequency} onChange={onChange} />
        </div>
        <div className="form-grid-3">
          <SelectField label="Setor" name="department_id" value={form.department_id} onChange={onChange} options={deptOpts} placeholder="Opcional" />
          <SelectField label="Linha" name="line_id" value={form.line_id} onChange={onChange} options={lineOpts} placeholder="Opcional" />
          <SelectField label="Máquina/ativo" name="asset_id" value={form.asset_id} onChange={onChange} options={assetOpts} placeholder="Opcional" />
        </div>
        <InputField label="Horário esperado" name="expected_time" value={form.expected_time} onChange={onChange} />
        <SelectField label="Responsável" name="responsible_id" value={form.responsible_id} onChange={onChange} options={userOpts} placeholder="Opcional" />
        <SelectField label="Checklist associado" name="checklist_id" value={form.checklist_id} onChange={onChange} options={checklistOpts} placeholder="Opcional" />
        <TextAreaField label="Itens de verificação (JSON)" name="verification_items" value={form.verification_items} onChange={onChange} rows={4} />
        <TextAreaField label="Critérios de conformidade" name="conformity_criteria" value={form.conformity_criteria} onChange={onChange} rows={2} />
        <TextAreaField label="Procedimentos relacionados" name="related_procedures" value={form.related_procedures} onChange={onChange} rows={2} />
        <TextAreaField label="Ação em não conformidade" name="non_conformity_action" value={form.non_conformity_action} onChange={onChange} rows={2} />
        <TextAreaField label="Observações" name="notes" value={form.notes} onChange={onChange} rows={2} />
      </>
    ),
    shifts: (
      <>
        <div className="form-grid-2">
          <InputField label="Nome do turno" name="name" value={form.name} onChange={onChange} required />
          <InputField label="Início (HH:MM)" name="start_time" value={form.start_time} onChange={onChange} />
        </div>
        <InputField label="Fim (HH:MM)" name="end_time" value={form.end_time} onChange={onChange} />
        <p className="form-helper" style={{ marginBottom: 8 }}>
          IDs de setores/linhas (UUID), um por linha — use os IDs dos cadastros ou copie da URL do departamento.
        </p>
        <TextAreaField label="Setores ativos (UUID por linha)" name="active_departments" value={form.active_departments} onChange={onChange} rows={2} />
        <TextAreaField label="Linhas ativas (UUID por linha)" name="active_lines" value={form.active_lines} onChange={onChange} rows={2} />
        <TextAreaField label="Equipes principais" name="main_teams" value={form.main_teams} onChange={onChange} rows={2} />
        <TextAreaField label="Responsáveis do turno (nomes ou IDs)" name="shift_responsibles" value={form.shift_responsibles} onChange={onChange} rows={2} />
        <SelectField label="Líder do turno" name="shift_leader_id" value={form.shift_leader_id} onChange={onChange} options={userOpts} placeholder="Opcional" />
        <TextAreaField label="Observações operacionais" name="operational_notes" value={form.operational_notes} onChange={onChange} rows={2} />
        <TextAreaField label="Rotinas específicas" name="shift_routines" value={form.shift_routines} onChange={onChange} rows={2} />
        <TextAreaField label="Riscos comuns" name="common_risks" value={form.common_risks} onChange={onChange} rows={2} />
        <TextAreaField label="Regras especiais" name="special_rules" value={form.special_rules} onChange={onChange} rows={2} />
      </>
    ),
    'area-responsibles': (
      <>
        <div className="form-grid-2">
          <InputField label="Nome da área" name="area_name" value={form.area_name} onChange={onChange} required />
          <InputField label="Tipo de área" name="area_type" value={form.area_type} onChange={onChange} />
        </div>
        <div className="form-grid-2">
          <SelectField label="Responsável principal" name="main_responsible_id" value={form.main_responsible_id} onChange={onChange} options={userOpts} placeholder="Opcional" />
          <SelectField label="Substituto" name="substitute_responsible_id" value={form.substitute_responsible_id} onChange={onChange} options={userOpts} placeholder="Opcional" />
        </div>
        <div className="form-grid-3">
          <SelectField label="Supervisor" name="supervisor_id" value={form.supervisor_id} onChange={onChange} options={userOpts} placeholder="Opcional" />
          <SelectField label="Gerente" name="manager_id" value={form.manager_id} onChange={onChange} options={userOpts} placeholder="Opcional" />
          <SelectField label="Diretor" name="director_id" value={form.director_id} onChange={onChange} options={userOpts} placeholder="Opcional" />
        </div>
        <TextAreaField label="Temas sob responsabilidade" name="responsible_themes" value={form.responsible_themes} onChange={onChange} rows={2} />
        <TextAreaField label="IDs de equipamentos (UUID)" name="responsible_assets" value={form.responsible_assets} onChange={onChange} rows={2} />
        <TextAreaField label="IDs de linhas (UUID)" name="responsible_lines" value={form.responsible_lines} onChange={onChange} rows={2} />
        <TextAreaField label="IDs de processos (UUID)" name="responsible_processes" value={form.responsible_processes} onChange={onChange} rows={2} />
        <TextAreaField label="Regras de acionamento" name="contact_rules" value={form.contact_rules} onChange={onChange} rows={2} />
        <TextAreaField label="Observações" name="notes" value={form.notes} onChange={onChange} rows={2} />
      </>
    ),
    'ai-config': (
      <>
        <div className="form-grid-2">
          <InputField label="Chave" name="config_key" value={form.config_key} onChange={onChange} required />
          <InputField label="Tipo" name="config_type" value={form.config_type} onChange={onChange} />
        </div>
        <TextAreaField label="Termos internos (um por linha)" name="internal_terms" value={form.internal_terms} onChange={onChange} rows={3} />
        <TextAreaField label="Nomes populares de máquinas (JSON: máquina → apelido)" name="machine_nicknames" value={form.machine_nicknames} onChange={onChange} rows={3} />
        <TextAreaField label="Siglas internas" name="internal_acronyms" value={form.internal_acronyms} onChange={onChange} rows={2} />
        <TextAreaField label="Palavras críticas" name="critical_words" value={form.critical_words} onChange={onChange} rows={2} />
        <TextAreaField label="Palavras sensíveis" name="sensitive_words" value={form.sensitive_words} onChange={onChange} rows={2} />
        <TextAreaField label="Temas sigilosos" name="confidential_themes" value={form.confidential_themes} onChange={onChange} rows={2} />
        <TextAreaField label="Temas prioritários" name="priority_themes" value={form.priority_themes} onChange={onChange} rows={2} />
        <TextAreaField label="Assuntos proibidos por perfil (JSON)" name="forbidden_per_profile" value={form.forbidden_per_profile} onChange={onChange} rows={3} />
        <TextAreaField label="Regras de resposta por perfil (JSON)" name="response_rules_per_profile" value={form.response_rules_per_profile} onChange={onChange} rows={3} />
        <InputField label="Preferência de linguagem" name="language_preference" value={form.language_preference} onChange={onChange} />
        <TextAreaField label="Regras de alerta automático (JSON)" name="auto_alert_rules" value={form.auto_alert_rules} onChange={onChange} rows={3} />
        <TextAreaField label="Gatilhos de monitoramento (JSON)" name="monitoring_triggers" value={form.monitoring_triggers} onChange={onChange} rows={3} />
        <TextAreaField label="Contextos com escalonamento" name="escalation_contexts" value={form.escalation_contexts} onChange={onChange} rows={2} />
        <TextAreaField label="Contextos com resposta discreta" name="discrete_response_contexts" value={form.discrete_response_contexts} onChange={onChange} rows={2} />
        <TextAreaField label="Contextos com resposta imediata" name="immediate_response_contexts" value={form.immediate_response_contexts} onChange={onChange} rows={2} />
        <TextAreaField label="Observações" name="notes" value={form.notes} onChange={onChange} rows={2} />
      </>
    ),
    'knowledge-docs': (
      <>
        <InputField label="Título" name="title" value={form.title} onChange={onChange} required />
        <div className="form-grid-2">
          <InputField label="Tipo de documento (POP, manual, norma…)" name="doc_type" value={form.doc_type} onChange={onChange} />
          <InputField label="Categoria" name="category" value={form.category} onChange={onChange} />
        </div>
        <TextAreaField label="Descrição resumida" name="summary" value={form.summary} onChange={onChange} rows={3} />
        <div className="form-grid-3">
          <SelectField label="Setor relacionado" name="department_id" value={form.department_id} onChange={onChange} options={deptOpts} placeholder="Opcional" />
          <SelectField label="Linha relacionada" name="line_id" value={form.line_id} onChange={onChange} options={lineOpts} placeholder="Opcional" />
          <SelectField label="Máquina/ativo" name="asset_id" value={form.asset_id} onChange={onChange} options={assetOpts} placeholder="Opcional" />
        </div>
        <div className="form-grid-2">
          <SelectField label="Processo" name="process_id" value={form.process_id} onChange={onChange} options={processOpts} placeholder="Opcional" />
          <SelectField label="Produto" name="product_id" value={form.product_id} onChange={onChange} options={productOpts} placeholder="Opcional" />
        </div>
        <div className="form-grid-2">
          <InputField label="Versão" name="version" value={form.version} onChange={onChange} />
          <InputField label="Validade" name="valid_until" type="date" value={form.valid_until} onChange={onChange} />
        </div>
        <SelectField label="Responsável" name="responsible_id" value={form.responsible_id} onChange={onChange} options={userOpts} placeholder="Opcional" />
        <TextAreaField label="Palavras-chave (uma por linha)" name="keywords" value={form.keywords} onChange={onChange} rows={2} />
        <InputField label="Nível de sigilo" name="confidentiality_level" value={form.confidentiality_level} onChange={onChange} />
        <TextAreaField label="Público permitido (perfis ou áreas, uma por linha)" name="allowed_audience" value={form.allowed_audience} onChange={onChange} rows={2} />
        <InputField label="URL do arquivo (Biblioteca / armazenamento)" name="external_url" value={form.external_url} onChange={onChange} />
        <TextAreaField label="Observações" name="notes" value={form.notes} onChange={onChange} rows={2} />
      </>
    )
  };

  return <div className="generic-form structural-generic-form">{g[module] || <InputField label="Nome" name="name" value={form.name} onChange={onChange} />}</div>;
}
