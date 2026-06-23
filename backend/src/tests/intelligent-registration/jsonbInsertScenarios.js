'use strict';

/**
 * Regressão — serialização JSONB do Registro Inteligente.
 * Causa raiz: arrays JS passados a colunas jsonb → "invalid input syntax for type json".
 */

const assert = require('assert');
const db = require('../../db');
const { serializeJsonbParam } = require('../../utils/jsonbParam');
const {
  buildRegistrationJsonbParams,
  normalizeOptionalShiftName
} = require('../../services/intelligentRegistrationService');

function testSerializeJsonbParam() {
  assert.strictEqual(serializeJsonbParam(['a', 'b']), '["a","b"]');
  assert.strictEqual(serializeJsonbParam(undefined, []), '[]');
  assert.strictEqual(serializeJsonbParam(null, {}), '{}');
  assert.strictEqual(serializeJsonbParam({ x: 1 }), '{"x":1}');
  assert.strictEqual(serializeJsonbParam('["ok"]'), '["ok"]');
  let threw = false;
  try {
    serializeJsonbParam('not-json');
  } catch (e) {
    threw = true;
    assert.match(e.message, /JSONB/i);
  }
  assert.ok(threw, 'string inválida deve falhar explicitamente');
}

function testBuildRegistrationJsonbParams() {
  const processed = {
    subcategories: ['producao'],
    activities_detected: ['soldagem'],
    problems_detected: [],
    pendencies_detected: ['revisar'],
    suggestions_detected: ['melhorar'],
    ai_metadata: {
      follow_up_classification: 'acompanhamento',
      organized_sections: { problems: ['fuga'] },
      attachments: [{ type: 'foto', url: '/uploads/x.jpg' }]
    }
  };
  const jsonb = buildRegistrationJsonbParams(processed);
  assert.doesNotThrow(() => JSON.parse(jsonb.subcategories));
  assert.doesNotThrow(() => JSON.parse(jsonb.activities_detected));
  assert.doesNotThrow(() => JSON.parse(jsonb.ai_metadata));
  const meta = JSON.parse(jsonb.ai_metadata);
  assert.ok(Array.isArray(meta.attachments));
}

function testNormalizeShift() {
  assert.strictEqual(normalizeOptionalShiftName(undefined), null);
  assert.strictEqual(normalizeOptionalShiftName(''), null);
  assert.strictEqual(normalizeOptionalShiftName('  Manhã '), 'Manhã');
}

async function testDbInsertScenarios() {
  const company = await db.query('SELECT id FROM companies LIMIT 1');
  const user = await db.query('SELECT id FROM users WHERE company_id = $1 LIMIT 1', [
    company.rows[0].id
  ]);
  if (!company.rows[0] || !user.rows[0]) {
    console.warn('[jsonbInsertScenarios] skip DB — sem company/user');
    return;
  }
  const cid = company.rows[0].id;
  const uid = user.rows[0].id;

  const scenarios = [
    {
      name: 'sem anexos',
      processed: {
        subcategories: [],
        activities_detected: [],
        problems_detected: [],
        pendencies_detected: [],
        suggestions_detected: [],
        ai_metadata: {}
      },
      shift: null
    },
    {
      name: 'turno vazio',
      processed: {
        subcategories: ['rotina'],
        activities_detected: ['inspeção'],
        problems_detected: [],
        pendencies_detected: [],
        suggestions_detected: [],
        ai_metadata: { complementary_questions: [] }
      },
      shift: null
    },
    {
      name: 'análise IA completa',
      processed: {
        subcategories: ['manutencao', 'qualidade'],
        activities_detected: ['lubrificação', 'ajuste'],
        problems_detected: ['vazamento'],
        pendencies_detected: ['peça'],
        suggestions_detected: ['preventiva'],
        ai_metadata: {
          follow_up_classification: 'escalonamento',
          organized_sections: { problems: ['vazamento'], pendencies: ['peça'] },
          critical_highlights: ['risco'],
          complementary_questions: ['Qual máquina?']
        }
      },
      shift: 'Tarde'
    },
    {
      name: 'com anexo foto',
      processed: {
        subcategories: [],
        activities_detected: [],
        problems_detected: [],
        pendencies_detected: [],
        suggestions_detected: [],
        ai_metadata: {
          attachments: [
            {
              type: 'foto',
              filename: 'linha.jpg',
              url: '/uploads/registro-inteligente/test.jpg'
            }
          ]
        }
      },
      shift: null
    },
    {
      name: 'com áudio transcrito',
      processed: {
        subcategories: [],
        activities_detected: ['relato por voz'],
        problems_detected: [],
        pendencies_detected: [],
        suggestions_detected: [],
        ai_metadata: {
          attachments: [{ type: 'audio', transcription: 'Teste de áudio operacional.' }],
          audio_transcription: 'Teste de áudio operacional.'
        }
      },
      shift: '22x06'
    }
  ];

  const insertedIds = [];

  for (const sc of scenarios) {
    const jsonb = buildRegistrationJsonbParams(sc.processed);
    const r = await db.query(
      `INSERT INTO intelligent_registrations (
        company_id, user_id, original_text, ai_summary, main_category, subcategories,
        priority, needs_followup, needs_escalation,
        activities_detected, problems_detected, pendencies_detected, suggestions_detected,
        shift_name, ai_metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, 'normal', false, false,
        $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12::jsonb
      ) RETURNING id`,
      [
        cid,
        uid,
        `Teste regressão — ${sc.name}`,
        'Resumo teste',
        'rotina',
        jsonb.subcategories,
        jsonb.activities_detected,
        jsonb.problems_detected,
        jsonb.pendencies_detected,
        jsonb.suggestions_detected,
        sc.shift,
        jsonb.ai_metadata
      ]
    );
    insertedIds.push(r.rows[0].id);
  }

  if (insertedIds.length) {
    await db.query('DELETE FROM intelligent_registrations WHERE id = ANY($1::int[])', [
      insertedIds
    ]);
  }
}

async function main() {
  testSerializeJsonbParam();
  testBuildRegistrationJsonbParams();
  testNormalizeShift();
  await testDbInsertScenarios();
  console.log('[intelligent-registration/jsonbInsertScenarios] OK');
}

main().catch((err) => {
  console.error('[intelligent-registration/jsonbInsertScenarios] FAIL', err);
  process.exit(1);
});
