const assert = require('node:assert/strict');
const test = require('node:test');

const openaiTts = require('../../services/openaiVozService');
const vozRouter = require('../../routes/voz');

const routeHandler = (path, method) => {
  const layer = vozRouter.stack.find(
    (candidate) => candidate.route?.path === path && candidate.route?.methods?.[method]
  );
  assert.ok(layer, `${method.toUpperCase()} ${path} deve existir`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
};

const invoke = async (handler, body = {}) => {
  const result = { statusCode: 200, payload: undefined };
  const response = {
    status(statusCode) {
      result.statusCode = statusCode;
      return this;
    },
    json(payload) {
      result.payload = payload;
      return this;
    }
  };

  await handler({ body }, response);
  return result;
};

test('MB-001: endpoints operacionais de voz não fabricam dados sem fonte configurada', async () => {
  const originalTts = openaiTts.gerarAudio;
  openaiTts.gerarAudio = async () => {
    throw new Error('TTS não deve ser chamado por endpoints sem fonte operacional');
  };

  try {
    const alertas = routeHandler('/alertas', 'get');
    const comando = routeHandler('/comando', 'post');

    assert.deepEqual(await invoke(alertas), {
      statusCode: 503,
      payload: {
        ok: false,
        status: 'not_configured',
        code: 'VOICE_OPERATIONAL_SOURCE_NOT_CONFIGURED',
        alerta: null,
        mensagem: null
      }
    });

    for (const body of [
      { comando: 'produção', falar: true },
      { comando: 'manutenção', falar: true },
      { comando: 'status geral', falar: false },
      {}
    ]) {
      assert.deepEqual(await invoke(comando, body), {
        statusCode: 503,
        payload: {
          ok: false,
          status: 'not_configured',
          code: 'VOICE_OPERATIONAL_SOURCE_NOT_CONFIGURED',
          resposta: null,
          audio: null
        }
      });
    }
  } finally {
    openaiTts.gerarAudio = originalTts;
  }
});
