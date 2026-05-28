'use strict';

/**
 * Roadmap de certificação — fases alinhadas ao FINAL_STRATEGIC_DEVELOPMENT_ROADMAP T3.
 */

function buildCertificationRoadmap(gapAnalysis, remediationMatrix) {
  const score = gapAnalysis.overall_score || 0;
  const p1 = remediationMatrix.p1_count || 0;

  const phases = [
    {
      phase: 'Q1',
      title: 'Audit-ready foundation',
      target_frameworks: ['ISO_27001', 'SOC2'],
      milestones: [
        'APM + retention + RLS on em produção',
        'DSR export/erase validados com evidência',
        'SOC2 CC6/CC7 observability pack 90 dias'
      ],
      exit_criteria: 'overall_score >= 55 && p1_gaps <= 3'
    },
    {
      phase: 'Q2',
      title: 'AI governance certification prep',
      target_frameworks: ['ISO_42001'],
      milestones: [
        'AI Model Registry completo',
        'HITL action runtime cobertura > 80% mutações',
        'Hallucination + lineage audit pack para auditor'
      ],
      exit_criteria: 'ISO42001 controls met >= 75%'
    },
    {
      phase: 'Q3',
      title: 'Industrial cybersecurity',
      target_frameworks: ['IEC_62443'],
      milestones: [
        'Telemetria real MQTT/OPC em lab',
        'Industrial backbone archive + replay audit',
        'Edge agent piloto com zone segmentation'
      ],
      exit_criteria: 'IEC controls met >= 60%'
    },
    {
      phase: 'Q4',
      title: 'External certification pursuit',
      target_frameworks: ['ISO_27001', 'ISO_42001', 'SOC2', 'IEC_62443'],
      milestones: [
        'Gap analysis externo (consultoria)',
        'Stage 1 ISO 27001 + SOC2 Type I',
        'IEC 62443 assessment com integrador OT'
      ],
      exit_criteria: 'Certificação formal iniciada (pelo menos 1 framework)'
    }
  ];

  return {
    current_maturity_stage: score >= 70 ? 5 : score >= 55 ? 4 : 3,
    current_overall_score: score,
    open_p1_remediations: p1,
    estimated_months_to_stage_7: score >= 70 ? 12 : score >= 55 ? 18 : 24,
    phases,
    strategic_note:
      'Roadmap advisory — não substitui auditor externo. Evidências técnicas em certification_readiness_snapshots.'
  };
}

module.exports = { buildCertificationRoadmap };
