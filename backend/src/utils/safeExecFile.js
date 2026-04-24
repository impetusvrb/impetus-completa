'use strict';

/**
 * Execução segura de binários via execFile (sem shell).
 * - Allowlist estrita de comandos
 * - Caminhos de ficheiros revalidados contra baseDir (path.resolve + relative)
 * - Argumentos sanitizados (sem metacaracteres de shell)
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/** Basenames aceites após path.resolve (evita executar /usr/bin/bash renomeado). */
const ALLOWED_BINARY_BASENAMES = {
  ffmpeg: new Set(['ffmpeg', 'ffmpeg.exe'])
};

const MAX_ARG_LENGTH = 4096;
/** Sem shell: ainda assim bloqueia metacaracteres típicos de injeção; não inclui \\ (caminhos Windows). */
const FORBIDDEN_ARG_CHARS = /[\r\n\0;&|<>$`]/;

/**
 * Garante que resolvedPath está dentro de baseDir (após normalize).
 * @param {string} resolvedPath
 * @param {string} baseDir
 * @returns {string} caminho absoluto resolvido
 */
function assertPathWithinBase(resolvedPath, baseDir) {
  const resolved = path.resolve(String(resolvedPath || ''));
  const base = path.resolve(String(baseDir || ''));
  const rel = path.relative(base, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    const e = new Error('Caminho fora da área permitida para execução.');
    e.code = 'EXEC_PATH_OUTSIDE_BASE';
    throw e;
  }
  return resolved;
}

/**
 * Resolve binário permitido para caminho absoluto quando possível.
 * @param {'ffmpeg'} commandKey
 * @returns {string}
 */
function resolveAllowedBinaryPath(commandKey) {
  const key = String(commandKey || '').toLowerCase();
  if (key !== 'ffmpeg') {
    const e = new Error('Binário não permitido para execFile.');
    e.code = 'EXEC_BINARY_NOT_ALLOWED';
    throw e;
  }

  const configured = process.env.FFMPEG_PATH && String(process.env.FFMPEG_PATH).trim();
  if (configured) {
    const abs = path.resolve(configured);
    if (!path.isAbsolute(abs)) {
      const e = new Error('FFMPEG_PATH deve ser um caminho absoluto.');
      e.code = 'EXEC_BAD_BINARY_PATH';
      throw e;
    }
    const base = path.basename(abs);
    const allowed = ALLOWED_BINARY_BASENAMES.ffmpeg;
    if (!allowed.has(base.toLowerCase())) {
      const e = new Error('FFMPEG_PATH deve apontar para um executável ffmpeg.');
      e.code = 'EXEC_BAD_BINARY_PATH';
      throw e;
    }
    let st;
    try {
      st = fs.statSync(abs);
    } catch {
      const e = new Error('FFMPEG_PATH não encontrado.');
      e.code = 'EXEC_BINARY_MISSING';
      throw e;
    }
    if (!st.isFile()) {
      const e = new Error('FFMPEG_PATH deve ser um ficheiro.');
      e.code = 'EXEC_BAD_BINARY_PATH';
      throw e;
    }
    return abs;
  }

  // Fallback: nome na PATH — menor garantia; preferir FFMPEG_PATH em produção.
  return 'ffmpeg';
}

/**
 * @param {string} s
 */
function assertSafeArgString(s) {
  const str = String(s);
  if (str.length > MAX_ARG_LENGTH) {
    const e = new Error('Argumento demasiado longo.');
    e.code = 'EXEC_ARG_TOO_LONG';
    throw e;
  }
  if (FORBIDDEN_ARG_CHARS.test(str)) {
    const e = new Error('Argumento contém caracteres não permitidos.');
    e.code = 'EXEC_ARG_UNSAFE';
    throw e;
  }
}

/**
 * @param {string} commandKey — chave da allowlist (ex.: ffmpeg)
 * @param {string[]} args — argumentos sem o binário
 * @param {object} [opts]
 * @param {number} [opts.timeout]
 * @param {string} [opts.cwd] — cwd absoluto opcional
 * @param {number} [opts.maxBuffer]
 * @param {{ index: number, baseDir: string }[]} [opts.pathArgBindings] — revalida args[index] contra baseDir
 */
async function safeExecFile(commandKey, args, opts = {}) {
  const bin = resolveAllowedBinaryPath(commandKey);
  if (!Array.isArray(args)) {
    const e = new Error('args deve ser um array.');
    e.code = 'EXEC_ARGS_INVALID';
    throw e;
  }

  const safeArgs = args.map((a) => String(a));
  for (const a of safeArgs) {
    assertSafeArgString(a);
  }

  const bindings = opts.pathArgBindings || [];
  for (const { index, baseDir } of bindings) {
    if (!Number.isInteger(index) || index < 0 || index >= safeArgs.length) continue;
    assertPathWithinBase(safeArgs[index], baseDir);
  }

  if (opts.cwd != null) {
    const c = path.resolve(String(opts.cwd));
    if (FORBIDDEN_ARG_CHARS.test(c)) {
      const e = new Error('cwd inválido.');
      e.code = 'EXEC_CWD_UNSAFE';
      throw e;
    }
  }

  return execFileAsync(bin, safeArgs, {
    timeout: opts.timeout,
    cwd: opts.cwd != null ? path.resolve(String(opts.cwd)) : undefined,
    maxBuffer: opts.maxBuffer ?? 10 * 1024 * 1024,
    windowsHide: true
  });
}

/**
 * Extrai frames com ffmpeg usando argumentos fixos e caminhos validados.
 * @param {object} p
 * @param {string} p.videoAbsPath — vídeo (abs, já validado)
 * @param {string} p.outputDir — diretório de saída (abs, já validado)
 * @param {string} p.sessionBaseDir — diretório da sessão (company/field-analysis/id) para revalidar paths
 * @param {number} [p.maxFrames]
 */
async function execFfmpegExtractFrames({ videoAbsPath, outputDir, sessionBaseDir, maxFrames = 4 }) {
  const mf = Math.max(1, Math.min(64, parseInt(maxFrames, 10) || 4));
  const pattern = path.join(path.resolve(outputDir), 'vf-%03d.jpg');
  if (path.basename(pattern) !== 'vf-%03d.jpg') {
    const e = new Error('Padrão de saída ffmpeg inválido.');
    e.code = 'EXEC_FFMPEG_BAD_PATTERN';
    throw e;
  }

  const args = ['-y', '-i', videoAbsPath, '-vf', 'fps=1/4', '-frames:v', String(mf), pattern];

  return safeExecFile('ffmpeg', args, {
    timeout: 120000,
    pathArgBindings: [
      { index: 2, baseDir: sessionBaseDir },
      { index: 7, baseDir: sessionBaseDir }
    ]
  });
}

module.exports = {
  safeExecFile,
  assertPathWithinBase,
  resolveAllowedBinaryPath,
  execFfmpegExtractFrames,
  ALLOWED_BINARY_BASENAMES
};
