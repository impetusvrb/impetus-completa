/**
 * INC-009 / INC-022 — Segregação de superfícies do dashboard integrado por perfil.
 */
import {
  resolveDashboardSurfaceCapabilities,
  hasMaintenanceDashboardSurface,
  resolveMaintenanceFromDashboardMe
} from '../../utils/dashboardSurfaceCapabilities.js';
import { isMaintenanceProfile } from '../../utils/roleUtils.js';

let passed = 0;
let failed = 0;

function ok(label, cond) {
  if (cond) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}`);
    failed++;
  }
}

console.log('\nINC-009/INC-022 dashboard-surface-segregation\n');

const MARCOS = {
  role: 'coordenador',
  dashboard_profile: 'coordinator_environmental',
  functional_area: 'environmental',
  job_title: 'Coordenador de Meio Ambiente',
  department: 'Meio Ambiente',
  structural_profile: {
    eixo_primario: 'eixo_ambiental',
    eixos: ['eixo_ambiental', 'eixo_qualidade', 'eixo_operacional', 'eixo_manutencao', 'eixo_executivo', 'eixo_sustentabilidade']
  }
};

const LIMA = {
  role: 'colaborador',
  dashboard_profile: 'technician_maintenance',
  functional_area: 'maintenance',
  job_title: 'Técnico de Manutenção'
};

const WELLINGTON = {
  role: 'ceo',
  dashboard_profile: 'ceo_executive',
  functional_area: 'executive',
  job_title: 'CEO'
};

const marcosCaps = resolveDashboardSurfaceCapabilities(MARCOS);
ok('Marcos environmental surface allowed', marcosCaps.environmental === true);
ok('Marcos maintenance surface denied', marcosCaps.maintenance === false);
ok('Marcos command center', marcosCaps.commandCenter === true);
ok('Marcos maintenanceFromProfile false with secondary eixo_manutencao', resolveMaintenanceFromDashboardMe({
  profile_code: 'coordinator_environmental',
  functional_area: 'environmental',
  structural_profile: MARCOS.structural_profile
}, MARCOS) === false);
ok('Marcos hasMaintenanceDashboardSurface false', hasMaintenanceDashboardSurface(MARCOS, false) === false);

const limaCaps = resolveDashboardSurfaceCapabilities(LIMA);
ok('Lima maintenance surface allowed', limaCaps.maintenance === true);
ok('Lima environmental surface denied', limaCaps.environmental === false);

const wellingtonCaps = resolveDashboardSurfaceCapabilities(WELLINGTON);
ok('Wellington executive surface', wellingtonCaps.executive === true);
ok('Wellington maintenance surface denied', wellingtonCaps.maintenance === false);

const coordMaint = {
  role: 'coordenador',
  dashboard_profile: 'coordinator_maintenance',
  functional_area: 'maintenance',
  job_title: 'Coordenador de Manutenção'
};
ok('Coordinator maintenance allowed', resolveDashboardSurfaceCapabilities(coordMaint).maintenance === true);

const GERENTE_QUALIDADE = {
  role: 'gerente',
  dashboard_profile: 'manager_quality',
  functional_area: 'quality',
  job_title: 'Gerente de Qualidade',
  department: 'Qualidade',
  structural_profile: {
    eixo_primario: 'eixo_qualidade',
    eixos: ['eixo_qualidade', 'eixo_operacional', 'eixo_manutencao', 'eixo_laboratorial']
  }
};

const TECNICO_QUALIDADE = {
  role: 'colaborador',
  dashboard_profile: 'inspector_quality',
  functional_area: 'quality',
  job_title: 'Técnico de Qualidade',
  department: 'Qualidade',
  structural_profile: {
    eixo_primario: 'eixo_qualidade',
    eixos: ['eixo_qualidade', 'eixo_manutencao', 'eixo_operacional']
  }
};

const gerenteCaps = resolveDashboardSurfaceCapabilities(GERENTE_QUALIDADE);
ok('Gerente quality surface allowed', gerenteCaps.quality === true);
ok('Gerente maintenance surface denied', gerenteCaps.maintenance === false);
ok('Gerente command center', gerenteCaps.commandCenter === true);
ok('Gerente maintenanceFromProfile false with secondary eixo_manutencao', resolveMaintenanceFromDashboardMe({
  profile_code: 'manager_quality',
  functional_area: 'quality',
  structural_profile: GERENTE_QUALIDADE.structural_profile
}, GERENTE_QUALIDADE) === false);
ok('Gerente hasMaintenanceDashboardSurface false', hasMaintenanceDashboardSurface(GERENTE_QUALIDADE, false) === false);

const tecnicoCaps = resolveDashboardSurfaceCapabilities(TECNICO_QUALIDADE);
ok('Tecnico qualidade quality surface allowed', tecnicoCaps.quality === true);
ok('Tecnico qualidade maintenance denied despite tecnic heuristic', tecnicoCaps.maintenance === false);
ok('Tecnico qualidade maintenanceFromProfile false', resolveMaintenanceFromDashboardMe({
  profile_code: 'inspector_quality',
  functional_area: 'quality',
  structural_profile: TECNICO_QUALIDADE.structural_profile
}, TECNICO_QUALIDADE) === false);

/** Contaminação real: functional_area=maintenance errado no payload, perfil/cargo de qualidade prevalecem. */
const GERENTE_QUALIDADE_FA_ERRADA = {
  ...GERENTE_QUALIDADE,
  functional_area: 'maintenance'
};
ok('Gerente quality blocks maintenance despite wrong functional_area', resolveDashboardSurfaceCapabilities(GERENTE_QUALIDADE_FA_ERRADA).maintenance === false);
ok('Gerente isMaintenanceProfile false with wrong functional_area', isMaintenanceProfile(GERENTE_QUALIDADE_FA_ERRADA) === false);

const RH_ANA = {
  role: 'gerente',
  dashboard_profile: 'hr_management',
  functional_area: 'hr',
  job_title: 'Gerente de RH',
  department: 'Recursos Humanos'
};
ok('RH maintenance surface denied', resolveDashboardSurfaceCapabilities(RH_ANA).maintenance === false);
ok('RH command center', resolveDashboardSurfaceCapabilities(RH_ANA).commandCenter === true);

const COORD_QUALIDADE = {
  role: 'coordenador',
  dashboard_profile: 'coordinator_quality',
  functional_area: 'quality',
  job_title: 'Coordenador de Qualidade',
  structural_profile: { eixo_primario: 'eixo_qualidade', eixos: ['eixo_qualidade', 'eixo_manutencao'] }
};
ok('Coord quality maintenance denied', resolveDashboardSurfaceCapabilities(COORD_QUALIDADE).maintenance === false);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
