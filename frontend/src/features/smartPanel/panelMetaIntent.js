/**
 * Intenção conversacional sobre o painel (imprimir, PDF, Excel).
 * Complementa o parser por regex — entende pedidos naturais, não só palavras-chave fixas.
 */

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pergunta «como fazer» — não é comando de execução. */
function isHowToQuestion(text) {
  const n = norm(text);
  if (!/\b(como|onde|qual\s+menu|passo\s+a\s+passo|tutorial|ensina|explica)\b/.test(n)) {
    return false;
  }
  if (/\b(quero|preciso|pode|podia|seria|faz|fac|manda|envia|imprime|imprimir|baixa|gera|tira|d[aá])\b/.test(n)) {
    return false;
  }
  return true;
}

function hasPanelContext(n) {
  return /\b(painel|relatorio|resumo|grafico|isso|isto|aquilo|resultado|dados|conteudo|documento|tabela|kpi|o\s+que\s+(?:gerou|mostrou|criou|montou)|que\s+(?:gerou|mostrou)|agora|aqui)\b/.test(
    n
  );
}

function isShortRequest(len) {
  return len <= 100;
}

/**
 * @param {string} stripped
 * @returns {{ kind: 'print'|'pdf'|'excel' } | null}
 */
export function inferConversationalPanelMeta(stripped) {
  const raw = String(stripped || '').trim();
  if (!raw || raw.length > 240) return null;
  if (isHowToQuestion(raw)) return null;

  const n = norm(raw);
  const panelCtx = hasPanelContext(n);
  const short = isShortRequest(raw.length);

  const printFamily =
    /\b(imprim\w*|impress\w*|print\w*|impressora|copia\s+em\s+papel|folha\s+impressa|versao\s+impressa|tirar\s+(?:uma\s+)?copia|copia\s+disso|em\s+papel|mandar\s+pra\s+impressora|na\s+impressora)\b/.test(
      n
    );
  const printRequest =
    printFamily &&
    (panelCtx ||
      short ||
      /\b(para\s+mim|pra\s+mim|por\s+favor|agora|ja|isso|isto)\b/.test(n) ||
      /^(?:pode|podia|quero|preciso|seria|d[aá]|me\s+ajuda|voc[eê]\s+pode|vc\s+pode|consegue)/.test(n));

  if (printRequest && !/\b(nao\s+imprim|sem\s+imprim|deixa\s+de\s+imprim)\b/.test(n)) {
    return { kind: 'print' };
  }

  if (/\b(copia|reproduz)\b/.test(n) && panelCtx && !/\b(email|whatsapp|pdf)\b/.test(n)) {
    return { kind: 'print' };
  }

  const explicitPdfExport =
    /\b(baix|descarreg|export|download|salv|imprim)\w*\b/.test(n) ||
    /\b(?:quero|preciso|pode|seria)\s+(?:o\s+)?pdf\b/.test(n) ||
    /^pdf\b/.test(n);
  if (/\bpdf\b/.test(n) && explicitPdfExport && (panelCtx || /\b(baix|descarreg|export|salv|imprim|quero|preciso)\b/.test(n))) {
    return { kind: 'pdf' };
  }
  if (
    /\b(baixar|baixa|descarregar|descarrega|download|salvar|exportar|guardar|pegar)\w*\b/.test(n) &&
    panelCtx &&
    !/\b(excel|planilha|xlsx|imprim)\b/.test(n)
  ) {
    return { kind: 'pdf' };
  }
  if (/\b(quero|preciso|pode|seria)\s+(?:o\s+)?(?:arquivo|ficheiro|documento)\b/.test(n) && panelCtx) {
    return { kind: 'pdf' };
  }

  if (/\b(excel|planilha|xlsx|spreadsheet)\b/.test(n) && (panelCtx || short || /\b(baix|export|gera|quero|preciso|pode|seria)\b/.test(n))) {
    return { kind: 'excel' };
  }

  return inferConversationalChatMeta(raw, n, panelCtx, short);
}

/**
 * @param {string} raw
 * @param {string} n — norm(raw)
 * @param {boolean} panelCtx
 * @param {boolean} short
 */
function inferConversationalChatMeta(raw, n, panelCtx, short) {
  const sendVerb = /\b(enviar|envia|envie|mandar|manda|mande|passar|passa|repassar|encaminhar|encaminha|disparar|dispara)\w*\b/.test(
    n
  );
  if (!sendVerb) return null;
  if (/\b(email|e-mail|whatsapp|telegram|sms)\b/.test(n)) return null;

  const chatCtx =
    /\b(chat|mensagem|impetus|interno|conversa|contacto|colega)\b/.test(n) || panelCtx || short;

  if (!chatCtx && raw.length > 80) return null;

  const groupM = raw.match(/\b(?:para|pr[oó]|pro)\s+(?:o|a)\s+grupo\s+([^.,!?]+)/i);
  if (groupM) {
    const gname = groupM[1].trim();
    if (gname.length >= 2) {
      return { kind: 'chat', userQueries: [], groupQuery: gname, roleQueries: [] };
    }
  }

  const pluralM = raw.match(/\b(?:para|pr[oó]|pro)\s+(?:os|as)\s+([^.,!?]+)/i);
  if (pluralM) {
    const label = pluralM[1].trim().replace(/\s+no\s+chat.*$/i, '');
    if (label.length >= 3) {
      return { kind: 'chat', userQueries: [], groupQuery: label, roleQueries: [label] };
    }
  }

  const paraM = raw.match(
    /\b(?:para|pr[oó]|pro)\s+(?:o|a|os|as)?\s*([^.,!?]+?)(?:\s+no\s+chat|\s+no\s+impetus|\s+pelo\s+chat|[,.]|$)/i
  );
  if (paraM) {
    let name = paraM[1].trim();
    name = name.replace(/^(?:o|a|os|as)\s+/i, '').trim();
    if (
      name.length >= 2 &&
      !/^(?:revis[aã]o|produ[cç][aã]o|sistema|isso|isto|aquilo|mim|si)$/i.test(name)
    ) {
      return { kind: 'chat', userQueries: [name], groupQuery: null, roleQueries: [] };
    }
  }

  if (/\b(?:isso|isto|painel|relat[oó]rio)\b/.test(n) && sendVerb && (panelCtx || short)) {
    const lastPara = raw.match(/\bpara\s+(.+)$/i);
    if (lastPara) {
      const name = lastPara[1].replace(/\s+no\s+chat.*$/i, '').trim();
      if (name.length >= 2) {
        return { kind: 'chat', userQueries: [name.replace(/^(?:o|a)\s+/i, '')], groupQuery: null, roleQueries: [] };
      }
    }
  }

  return null;
}
