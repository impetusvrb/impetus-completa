/**
 * IMPETUS - AI Orchestrator
 * Orquestra a tríade de IAs: Claude (analítica), Gemini (multimodal), ChatGPT (conversação)
 * Distribui tarefas, armazena em enterprise_ai_memory, valida cruzada quando necessário
 */
const db = require('../db');
const ai = require('./ai');
const claudeService = require('./claudeService');
const geminiService = require('./geminiService');

const QUERY_TYPES = {
  DADOS: ['dado', 'produção', 'produtividade', 'kpi', 'indicador', 'gráfico', 'grafico', 'relatório', 'relatorio', 'manutenção', 'manutencao', 'logística', 'logistica', 'custo', 'financeiro', 'falha', 'perda', 'registro'],
  OPERACAO_FISICA: ['máquina', 'maquina', 'equipamento', 'sensor', 'câmera', 'camera', 'vídeo', 'video', 'imagem', 'painel', 'vibração', 'vibracao', 'ruído', 'ruido', 'parada', 'linha']
};

/**
 * Classifica o tipo de pergunta para rotear à IA correta
 */
function classifyQuery(query) {
  if (!query || typeof query !== 'string') return 'conversation';
  const q = query.toLowerCase().trim();
  const dadosMatch = QUERY_TYPES.DADOS.some(k => q.includes(k));
  const operacaoMatch = QUERY_TYPES.OPERACAO_FISICA.some(k => q.includes(k));
  if (operacaoMatch && (q.includes('?') || q.includes('como') || q.includes('por que'))) return 'multimodal';
  if (dadosMatch) return 'analytical';
  return 'conversation';
}

/**
 * Analisa dados via Claude (produção, custos, indicadores)
 */
async function analyzeDataViaClaude(payload, companyId = null) {
  const { data, context, query } = payload;
  if (!claudeService.isAvailable()) {
    return { ok: false, error: 'Claude não disponível', fallback: true };
  }

  const systemPrompt = `Você é o analista de dados operacionais do Impetus. Analise os dados fornecidos e retorne JSON:
{
  "tipo_grafico": "linha|barra|pizza|tabela",
  "titulo": "string",
  "dados_processados": [...],
  "insights": ["string"],
  "alertas": ["string"],
  "recomendacoes": ["string"]
}

Seja objetivo. Destaque quedas de produtividade, perdas financeiras e anomalias.`;

  const userContent = `Contexto: ${JSON.stringify(context || {})}\n\nDados: ${JSON.stringify(data || {}).slice(0, 12000)}\n\nPergunta/objetivo: ${query || 'Analise e sugira.'}`;

  const raw = await claudeService.analyze(systemPrompt, userContent, { max_tokens: 2048 });
  if (!raw) return { ok: false, error: 'Claude não retornou' };

  try {
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : { insights: [raw], alertas: [] };
    return { ok: true, ...parsed, source: 'claude' };
  } catch {
    return { ok: true, insights: [raw], alertas: [], source: 'claude' };
  }
}

/**
 * Analisa mídia/sensores via Gemini
 */
async function analyzeMultimodalViaGemini(payload, companyId = null) {
  const { imageBase64, sensorData, prompt } = payload;
  if (!geminiService.isAvailable()) {
    return { ok: false, error: 'Gemini não disponível', fallback: true };
  }

  if (imageBase64) {
    const result = await geminiService.analyzeImage(imageBase64, prompt || 'Analise esta imagem industrial.');
    return result ? { ok: true, descricao: result, source: 'gemini' } : { ok: false, error: 'Gemini não retornou' };
  }

  if (sensorData) {
    const result = await geminiService.analyzeSensorData(sensorData, payload.context || {});
    return result ? { ok: true, ...result, source: 'gemini' } : { ok: false, error: 'Gemini não retornou' };
  }

  return { ok: false, error: 'Nenhum dado multimodal fornecido' };
}

/**
 * Responde via ChatGPT (conversação) - pode consultar outras IAs
 */
async function chatViaGPT(messages, opts = {}) {
  const { companyId, query, consultOrchestrator = true } = opts;
  const lastUserMsg = Array.isArray(messages) ? messages.filter(m => m.role === 'user').pop()?.content : null;
  const textContent = typeof lastUserMsg === 'string' ? lastUserMsg : (lastUserMsg?.find?.((p) => p.type === 'text')?.text || '');

  let contextFromOrchestrator = '';
  if (consultOrchestrator && textContent && companyId) {
    const qType = classifyQuery(textContent);
    if (qType === 'analytical') {
      const memory = await getRecentMemory(companyId, 'insight', 5);
      if (memory.length) contextFromOrchestrator = `\n\n## Contexto das análises recentes:\n${memory.map((m) => `- ${m.content}`).join('\n')}`;
    }
    if (qType === 'multimodal') {
      const events = await getRecentMemory(companyId, 'evento', 3);
      if (events.length) contextFromOrchestrator = `\n\n## Eventos operacionais recentes:\n${events.map((e) => `- ${e.content}`).join('\n')}`;
    }
  }

  const enrichedMessages = [...(Array.isArray(messages) ? messages : [])];
  if (contextFromOrchestrator && enrichedMessages.length) {
    const sysIdx = enrichedMessages.findIndex((m) => m.role === 'system');
    if (sysIdx >= 0) {
      enrichedMessages[sysIdx].content = (enrichedMessages[sysIdx].content || '') + contextFromOrchestrator;
    } else {
      enrichedMessages.unshift({ role: 'system', content: `Contexto adicional do sistema:${contextFromOrchestrator}` });
    }
  }

  return ai.chatCompletion(null, { messages: enrichedMessages, max_tokens: opts.max_tokens || 1024, timeout: opts.timeout });
}

/**
 * Salva na memória empresarial
 */
async function storeInMemory(companyId, sourceAi, memoryType, content, structuredData = {}, confidence = 1) {
  if (!companyId) return null;
  try {
    await db.query(
      `INSERT INTO enterprise_ai_memory (company_id, source_ai, memory_type, content, structured_data, confidence)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [companyId, sourceAi, memoryType, content, JSON.stringify(structuredData), confidence]
    );
    return true;
  } catch (err) {
    console.warn('[AI_ORCHESTRATOR] storeInMemory:', err.message);
    return false;
  }
}

/**
 * Busca memória recente
 */
async function getRecentMemory(companyId, memoryType, limit = 10) {
  if (!companyId) return [];
  try {
    const r = await db.query(
      `SELECT content, structured_data, created_at FROM enterprise_ai_memory
       WHERE company_id = $1 AND (memory_type = $2 OR $2 IS NULL) AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC LIMIT $3`,
      [companyId, memoryType || null, limit]
    );
    return r.rows || [];
  } catch {
    return [];
  }
}

/**
 * Validação cruzada: compara informação com dados do sistema
 */
async function crossValidate(claim, sources) {
  const results = [];
  if (sources.claude && claudeService.isAvailable()) {
    const r = await claudeService.analyze(
      'Verifique se a afirmação seguinte é consistente com os dados. Retorne: {"consistente": true/false, "confianca": 0-1, "explicacao": "string"}',
      `Afirmação: "${claim}"\nDados: ${JSON.stringify(sources.claude)}`,
      { max_tokens: 256 }
    );
    if (r) {
      const m = r.match(/\{[\s\S]*\}/);
      if (m) results.push(JSON.parse(m[0]));
    }
  }
  if (sources.gemini && geminiService.isAvailable() && sources.gemini.sensorData) {
    const r = await geminiService.analyzeSensorData(sources.gemini.sensorData, { claim });
    if (r) results.push({ consistente: r.nivel_risco !== 'crítico', confianca: 0.8, explicacao: r.recomendacao });
  }

  const consistentCount = results.filter((x) => x.consistente).length;
  const avgConf = results.length ? results.reduce((a, x) => a + (x.confianca || 0), 0) / results.length : 0;

  return {
    status: consistentCount >= results.length && results.length > 0 ? 'verificado' : results.length ? 'divergente' : 'nao_validado',
    confiabilidade: Math.round(avgConf * 100),
    fontes: results.length,
    detalhes: results
  };
}

/**
 * Cadastra conhecimento na company_operation_memory (módulo Cadastrar com IA)
 */
async function storeCompanyKnowledge(companyId, category, content, opts = {}) {
  if (!companyId) return null;
  try {
    const r = await db.query(
      `INSERT INTO company_operation_memory (company_id, category, content, source_input, sector, related_equipment, related_process)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        companyId,
        category,
        JSON.stringify(content),
        opts.sourceInput || 'texto',
        opts.sector || null,
        opts.relatedEquipment || null,
        opts.relatedProcess || null
      ]
    );
    return r.rows?.[0]?.id || null;
  } catch (err) {
    console.warn('[AI_ORCHESTRATOR] storeCompanyKnowledge:', err.message);
    return null;
  }
}

/**
 * Interpreta e cadastra conteúdo via IA (texto, imagem)
 */
async function interpretAndStore(companyId, input, opts = {}) {
  const { type = 'texto', filePath, text } = input;

  if (type === 'imagem' && filePath && geminiService.isAvailable()) {
    const parsed = await geminiService.interpretFileForCadastro(filePath, opts);
    if (parsed && parsed.tipo) {
      const id = await storeCompanyKnowledge(companyId, parsed.tipo, parsed, { sourceInput: 'imagem' });
      return { ok: true, id, parsed };
    }
  }

  if ((type === 'texto' || type === 'documento') && text && ai.isAvailable()) {
    const prompt = `Extraia informações para cadastro operacional deste texto. Retorne JSON:
{ "tipo": "equipamento|processo|custo|material|fornecedor|documento|rotina|outro", "itens": [{ "nome": "...", "detalhes": "..." }], "observacoes": "..." }

Texto: ${(text || '').slice(0, 6000)}`;
    const raw = await ai.chatCompletion(prompt, { max_tokens: 1024 });
    const m = (raw || '').match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      const id = await storeCompanyKnowledge(companyId, parsed.tipo || 'outro', parsed, { sourceInput: type });
      return { ok: true, id, parsed };
    }
  }

  return { ok: false, error: 'Não foi possível interpretar' };
}

module.exports = {
  classifyQuery,
  analyzeDataViaClaude,
  analyzeMultimodalViaGemini,
  chatViaGPT,
  storeInMemory,
  getRecentMemory,
  crossValidate,
  storeCompanyKnowledge,
  interpretAndStore
};
