/**
 * Cadastro de Cargos — Engine de Identidade Organizacional
 */
import React, { useMemo } from 'react';
import { InputField, SelectField, TextAreaField, CheckboxField } from '../../components/FormField';
import RoleCadastroModulePreview from './RoleCadastroModulePreview';

const HIERARCHY_DEFAULT = [
  { value: 0, label: 'Presidência' },
  { value: 1, label: 'Diretoria' },
  { value: 2, label: 'Gerência' },
  { value: 3, label: 'Coordenação' },
  { value: 4, label: 'Supervisão' },
  { value: 5, label: 'Operacional' }
];

function splitLines(val) {
  if (!val) return [];
  return String(val).split('\n').map((x) => x.trim()).filter(Boolean);
}

function buildSuperiorRoleOptions(refsRoles, listItems, excludeRoleId) {
  const map = new Map();
  for (const r of refsRoles || []) {
    if (r?.id && r.id !== excludeRoleId) {
      map.set(r.id, { value: r.id, label: r.name || String(r.id) });
    }
  }
  for (const row of listItems || []) {
    if (row?.id && row.id !== excludeRoleId) {
      map.set(row.id, { value: row.id, label: row.name || String(row.id) });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'pt-BR')
  );
}

export default function RoleIdentityForm({
  form,
  refs,
  refsLoading = false,
  refsError = null,
  onChange,
  editingRoleId,
  roleListItems,
  formErrors = {}
}) {
  const deptOpts = (refs?.departments || []).map((d) => ({ value: d.id, label: d.name }));
  const unitOpts = (refs?.organizationalUnits || []).map((u) => ({
    value: u.id,
    label: `${u.name}${u.unit_type ? ` (${u.unit_type})` : ''}`
  }));
  const hierarchyOpts = (refs?.hierarchyLevels || HIERARCHY_DEFAULT).map((h) => ({
    value: String(h.value),
    label: h.label
  }));
  const scopeOpts = (refs?.operationalScopes || ['estrategico', 'tatico', 'operacional', 'corporativo']).map(
    (s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })
  );
  const critOpts = (refs?.criticalityLevels || ['baixo', 'medio', 'alto', 'critico']).map((c) => ({
    value: c,
    label: c.charAt(0).toUpperCase() + c.slice(1)
  }));
  const sensOpts = (refs?.sensitivityLevels || [
    'publico_interno',
    'restrito',
    'confidencial',
    'executivo'
  ]).map((s) => ({
    value: s,
    label: s.replace(/_/g, ' ')
  }));
  const functionalHintOpts = (refs?.functionalAreas || [
    { id: 'executive', label: 'Diretoria / Executivo' },
    { id: 'operations', label: 'Operações' },
    { id: 'finance', label: 'Financeiro' },
    { id: 'hr', label: 'RH / Pessoas' },
    { id: 'production', label: 'Produção' },
    { id: 'maintenance', label: 'Manutenção' },
    { id: 'quality', label: 'Qualidade' },
    { id: 'environmental', label: 'Meio Ambiente' },
    { id: 'logistics', label: 'Logística' }
  ]).map((a) => ({
    value: a.id,
    label: a.label || a.id
  }));

  const maxScopeOpts = (refs?.maxScopeLimits || [
    'proprio_setor',
    'proprio_departamento',
    'unidade_inteira',
    'empresa_inteira'
  ]).map((m) => ({
    value: m,
    label: m.replace(/_/g, ' ')
  }));

  const sectorOpts = useMemo(() => {
    const deptId = form.department_id;
    if (!deptId) return [];
    return (refs?.sectors || [])
      .filter((s) => String(s.department_id) === String(deptId))
      .map((s) => ({ value: s.id, label: s.name }));
  }, [refs?.sectors, form.department_id]);

  const sectorSelectDisabled = refsLoading || !form.department_id || sectorOpts.length === 0;
  const sectorHelperText = (() => {
    if (refsLoading) return 'Carregando setores oficiais…';
    if (refsError) return 'Falha ao carregar referências. Feche e reabra o formulário ou atualize a página.';
    if (!form.department_id) return 'Selecione o departamento para listar os setores vinculados.';
    if (sectorOpts.length === 0) {
      return 'Nenhum setor neste departamento — cadastre em Base Estrutural → Setores Oficiais.';
    }
    return 'Obrigatório — vinculado ao departamento selecionado.';
  })();

  const unitHelperText = (() => {
    if (refsLoading) return 'Carregando unidades…';
    if (unitOpts.length === 0) {
      return 'Cadastre unidades em Base Estrutural → Unidades Organizacionais (ou aguarde o bootstrap da matriz).';
    }
    return 'Opcional — unidade física ou jurídica da empresa.';
  })();

  const superiorOpts = buildSuperiorRoleOptions(refs?.roles, roleListItems, editingRoleId);

  const selectedRole = (roleListItems || []).find((r) => r.id === editingRoleId);
  const subordinates = (roleListItems || []).filter(
    (r) => r.direct_superior_role_id === editingRoleId
  );

  const err = (key) => formErrors[key];

  const hasErrors = Object.keys(formErrors).length > 0;

  return (
    <div className="role-identity-form">
      <p className="role-identity-form__intro">
        Cadastro oficial de identidade organizacional. Departamento e setor são obrigatórios e
        vinculados ao cadastro mestre — a IA e os dashboards usam apenas esta estrutura validada.
      </p>

      {hasErrors && (
        <div className="role-identity-form__errors" role="alert">
          <strong>Corrija antes de salvar:</strong>
          <ul>
            {Object.entries(formErrors).map(([key, msg]) => (
              <li key={key}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <h4 className="structural-form-section-title">Identificação</h4>
      <div className="form-grid-2">
        <InputField
          label="Nome do cargo"
          name="name"
          value={form.name}
          onChange={onChange}
          required
          error={err('name')}
        />
        <InputField
          label="Código interno"
          name="internal_code"
          value={form.internal_code || ''}
          onChange={onChange}
          readOnly={!form.internal_code}
          helperText="Gerado automaticamente ao salvar (ex.: DIR_EXEC_001)"
        />
      </div>
      <SelectField
        label="Nível hierárquico"
        name="hierarchy_level"
        value={form.hierarchy_level != null ? String(form.hierarchy_level) : ''}
        onChange={onChange}
        required
        options={hierarchyOpts}
        error={err('hierarchy_level')}
      />

      <h4 className="structural-form-section-title">Estrutura organizacional</h4>
      <div className="form-grid-2">
        <SelectField
          label="Departamento principal"
          name="department_id"
          value={form.department_id || ''}
          onChange={onChange}
          required
          disabled={refsLoading || !deptOpts.length}
          options={deptOpts}
          placeholder={deptOpts.length ? 'Selecione o departamento cadastrado' : 'Nenhum departamento ativo'}
          error={err('department_id')}
          helperText={
            refsLoading
              ? 'Carregando departamentos…'
              : deptOpts.length
                ? 'Obrigatório — sem texto manual'
                : 'Cadastre departamentos em Administração → Departamentos.'
          }
        />
        <SelectField
          label="Setor principal"
          name="sector_id"
          value={form.sector_id || ''}
          onChange={onChange}
          required
          disabled={sectorSelectDisabled}
          options={sectorOpts}
          placeholder={form.department_id ? 'Selecione o setor' : 'Selecione o departamento primeiro'}
          error={err('sector_id')}
          helperText={sectorHelperText}
        />
      </div>
      <div className="form-grid-2">
        <SelectField
          label="Unidade organizacional"
          name="organizational_unit_id"
          value={form.organizational_unit_id || ''}
          onChange={onChange}
          disabled={refsLoading}
          options={[{ value: '', label: 'Nenhuma / padrão empresa' }, ...unitOpts]}
          showPlaceholder={false}
          helperText={unitHelperText}
        />
        <SelectField
          label="Cargo superior direto"
          name="direct_superior_role_id"
          value={form.direct_superior_role_id || ''}
          onChange={onChange}
          options={[{ value: '', label: 'Nenhum (topo da hierarquia)' }, ...superiorOpts]}
          error={err('direct_superior_role_id')}
        />
      </div>

      {editingRoleId && subordinates.length > 0 && (
        <div className="role-identity-subordinates">
          <span className="role-identity-subordinates__label">Cargos subordinados (automático)</span>
          <ul>
            {subordinates.map((s) => (
              <li key={s.id}>{s.name}{s.internal_code ? ` — ${s.internal_code}` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      <h4 className="structural-form-section-title">Identidade operacional</h4>
      <InputField
        label="Área de atuação"
        name="work_area"
        value={form.work_area || ''}
        onChange={onChange}
        placeholder="Ex: Produção, Financeiro, RH, Engenharia"
      />
      <div className="form-grid-2">
        <SelectField
          label="Área funcional do dashboard (hint)"
          name="dashboard_functional_hint"
          value={form.dashboard_functional_hint || ''}
          onChange={onChange}
          options={[{ value: '', label: 'Inferir só pelo cadastro abaixo' }, ...functionalHintOpts]}
          helperText="Opcional — reforça módulos do painel (ex.: executive → auditoria + operacional)"
        />
        <SelectField
          label="Escopo operacional"
          name="operational_scope"
          value={form.operational_scope || ''}
          onChange={onChange}
          options={[{ value: '', label: 'Selecione' }, ...scopeOpts]}
        />
      </div>
      <div className="form-grid-2">
        <InputField
          label="Frequência de tomada de decisão"
          name="decision_frequency"
          value={form.decision_frequency || ''}
          onChange={onChange}
          placeholder="Ex: baixa, moderada, alta, crítica"
        />
      </div>
      <TextAreaField
        label="Função organizacional"
        name="organizational_function"
        value={form.organizational_function || form.description || ''}
        onChange={onChange}
        rows={3}
        helperText="O que este cargo faz, como atua e sua missão organizacional"
      />
      <TextAreaField
        label="Contexto operacional padrão (IA)"
        name="operational_context"
        value={form.operational_context || ''}
        onChange={onChange}
        rows={4}
        helperText="Rotina, decisões comuns, responsabilidades e foco operacional para a IA contextual"
      />

      <h4 className="structural-form-section-title">Responsabilidades</h4>
      <TextAreaField
        label="Responsabilidades principais (uma por linha)"
        name="main_responsibilities"
        value={form.main_responsibilities}
        onChange={onChange}
        rows={3}
      />
      <TextAreaField
        label="Responsabilidades críticas"
        name="critical_responsibilities"
        value={form.critical_responsibilities}
        onChange={onChange}
        rows={2}
      />
      <SelectField
        label="Grau de criticidade"
        name="criticality_level"
        value={form.criticality_level || ''}
        onChange={onChange}
        options={[{ value: '', label: 'Selecione' }, ...critOpts]}
      />

      <h4 className="structural-form-section-title">Governança e permissões</h4>
      <TextAreaField
        label="Permissões recomendadas (módulos, uma por linha)"
        name="recommended_permissions"
        value={form.recommended_permissions}
        onChange={onChange}
        rows={2}
        helperText="Use chaves ou texto PT: operational, qualidade, rh, financeiro, audit, manutencao, seguranca…"
      />
      <TextAreaField
        label="Pode aprovar (workflows, uma por linha)"
        name="approval_domains"
        value={form.approval_domains}
        onChange={onChange}
        rows={2}
        placeholder="compras, férias, admissões, OS, contratos"
      />
      <div className="form-grid-2">
        <InputField
          label="Papel na aprovação (curto, máx. 80 caracteres)"
          name="approval_participation_role"
          value={
            (form.approval_participation_role || '').length <= 80
              ? form.approval_participation_role || ''
              : ''
          }
          onChange={onChange}
          placeholder="aprovador final, intermediário, consulta"
          helperText={
            (form.approval_role || '').length > 80
              ? 'Descrição longa guardada em "Papel em aprovações (detalhe)" abaixo — não apagar se quiser manter.'
              : 'Frase curta para o sistema. Textos longos use o campo de detalhe.'
          }
        />
        {(form.approval_role || (form.approval_participation_role || '').length > 80) && (
          <TextAreaField
            label="Papel em aprovações (detalhe)"
            name="approval_role"
            value={form.approval_role || form.approval_participation_role || ''}
            onChange={onChange}
            rows={2}
          />
        )}
        <InputField
          label="Papel na escalada (curto, máx. 80 caracteres)"
          name="escalation_participation_role"
          value={
            (form.escalation_participation_role || '').length <= 80
              ? form.escalation_participation_role || ''
              : ''
          }
          onChange={onChange}
          placeholder="ex.: escala para gerência"
        />
        {(form.escalation_role || (form.escalation_participation_role || '').length > 80) && (
          <TextAreaField
            label="Papel na escalada (detalhe)"
            name="escalation_role"
            value={form.escalation_role || form.escalation_participation_role || ''}
            onChange={onChange}
            rows={2}
          />
        )}
      </div>
      <InputField
        label="Papel na operação"
        name="operation_role"
        value={form.operation_role || ''}
        onChange={onChange}
        placeholder="estratégico, supervisão, execução, auditoria"
      />

      <h4 className="structural-form-section-title">Contexto da IA</h4>
      <TextAreaField
        label="Temas que pode visualizar"
        name="visible_themes"
        value={form.visible_themes}
        onChange={onChange}
        rows={2}
      />
      <TextAreaField
        label="Temas bloqueados"
        name="hidden_themes"
        value={form.hidden_themes}
        onChange={onChange}
        rows={2}
      />
      <SelectField
        label="Nível de sensibilidade permitido"
        name="sensitivity_level"
        value={form.sensitivity_level || ''}
        onChange={onChange}
        options={[{ value: '', label: 'Selecione' }, ...sensOpts]}
      />
      <div className="form-grid-2 role-identity-checkboxes">
        <CheckboxField
          label="Pode acessar dados estratégicos"
          name="access_strategic_data"
          checked={!!form.access_strategic_data}
          onChange={onChange}
        />
        <CheckboxField
          label="Pode acessar dados financeiros"
          name="access_financial_data"
          checked={!!form.access_financial_data}
          onChange={onChange}
        />
        <CheckboxField
          label="Pode acessar dados de RH"
          name="access_hr_data"
          checked={!!form.access_hr_data}
          onChange={onChange}
        />
        <CheckboxField
          label="Pode acessar indicadores críticos"
          name="access_critical_indicators"
          checked={!!form.access_critical_indicators}
          onChange={onChange}
        />
      </div>

      <h4 className="structural-form-section-title">Perfil comportamental</h4>
      <div className="form-grid-2">
        <InputField
          label="Tipo de liderança"
          name="leadership_type"
          value={form.leadership_type || ''}
          onChange={onChange}
        />
        <InputField
          label="Perfil de comunicação"
          name="communication_profile"
          value={form.communication_profile || ''}
          onChange={onChange}
        />
      </div>

      <h4 className="structural-form-section-title">Compliance e segurança</h4>
      <div className="form-grid-2 role-identity-checkboxes">
        <CheckboxField
          label="Exige validação documental"
          name="requires_document_validation"
          checked={!!form.requires_document_validation}
          onChange={onChange}
        />
        <CheckboxField
          label="Exige aprovação hierárquica"
          name="requires_hierarchical_approval"
          checked={!!form.requires_hierarchical_approval}
          onChange={onChange}
        />
        <CheckboxField
          label="Pode visualizar outros departamentos"
          name="can_view_other_departments"
          checked={!!form.can_view_other_departments}
          onChange={onChange}
        />
        <CheckboxField
          label="Permite criação manual deste cargo"
          name="allow_manual_creation"
          checked={form.allow_manual_creation !== false}
          onChange={onChange}
        />
      </div>
      <SelectField
        label="Limite máximo de escopo"
        name="max_scope_limit"
        value={form.max_scope_limit || ''}
        onChange={onChange}
        options={[{ value: '', label: 'Selecione' }, ...maxScopeOpts]}
      />
      <TextAreaField label="Observações internas" name="notes" value={form.notes || ''} onChange={onChange} rows={2} />

      <RoleCadastroModulePreview form={form} />
    </div>
  );
}

export { splitLines };
