#!/usr/bin/env python3
"""
API Flask (porta 5001) para Wav2Lip.

POST /lipsync  (multipart/form-data)
  - audio: arquivo WAV (voz)
  - face:  vídeo base (ex.: impetus-speaking.mp4)

Resposta: MP4 gerado (boca sincronizada).

Pré-requisitos:
  1) Clonar Wav2Lip dentro desta pasta ou definir WAV2LIP_ROOT:
       cd lipsync && git clone https://github.com/Rudrabha/Wav2Lip.git
  2) Colocar checkpoints/wav2lip.pth em Wav2Lip/checkpoints/
  3) pip install -r requirements.txt

Uso:
  export WAV2LIP_ROOT=/caminho/absoluto/lipsync/Wav2Lip
  python lipsync_api.py
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

from flask import Flask, Response, abort, request

app = Flask(__name__)

THIS_DIR = Path(__file__).resolve().parent
WAV2LIP_ROOT = Path(os.environ.get("WAV2LIP_ROOT", str(THIS_DIR / "Wav2Lip"))).resolve()
CHECKPOINT = Path(
    os.environ.get(
        "WAV2LIP_CHECKPOINT",
        str(WAV2LIP_ROOT / "checkpoints" / "wav2lip.pth"),
    )
)


def run_inference(face_path: Path, audio_path: Path, outfile: Path) -> None:
    inference = WAV2LIP_ROOT / "inference.py"
    if not inference.is_file():
        raise FileNotFoundError(f"inference.py não encontrado em {inference}")
    if not CHECKPOINT.is_file():
        raise FileNotFoundError(f"Checkpoint não encontrado: {CHECKPOINT}")

    cmd = [
        os.environ.get("PYTHON", "python3"),
        str(inference),
        "--checkpoint_path",
        str(CHECKPOINT),
        "--face",
        str(face_path),
        "--audio",
        str(audio_path),
        "--outfile",
        str(outfile),
        "--nosmooth",
    ]
    env = os.environ.copy()
    proc = subprocess.run(
        cmd,
        cwd=str(WAV2LIP_ROOT),
        capture_output=True,
        text=True,
        timeout=int(os.environ.get("WAV2LIP_TIMEOUT_SEC", "600")),
        env=env,
    )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(err or f"Wav2Lip falhou (código {proc.returncode})")


@app.route("/health", methods=["GET"])
def health():
    ok = (WAV2LIP_ROOT / "inference.py").is_file() and CHECKPOINT.is_file()
    return {"ok": ok, "wav2lip_root": str(WAV2LIP_ROOT)}, 200 if ok else 503


@app.route("/lipsync", methods=["POST"])
def lipsync():
    if "audio" not in request.files or "face" not in request.files:
        abort(400, "Envie multipart com campos 'audio' (wav) e 'face' (vídeo).")

    audio_f = request.files["audio"]
    face_f = request.files["face"]
    if not audio_f.filename or not face_f.filename:
        abort(400, "Arquivos vazios.")

    tmp = Path(tempfile.mkdtemp(prefix="lipsync_"))
    try:
        uid = uuid.uuid4().hex
        audio_path = tmp / f"{uid}.wav"
        face_path = tmp / f"{uid}_face{Path(face_f.filename).suffix or '.mp4'}"
        out_path = tmp / f"{uid}_out.mp4"

        audio_f.save(str(audio_path))
        face_f.save(str(face_path))

        run_inference(face_path, audio_path, out_path)
        if not out_path.is_file():
            abort(500, "Saída não gerada.")

        data = out_path.read_bytes()
        return Response(
            data,
            mimetype="video/mp4",
            headers={"Content-Disposition": "inline; filename=lipsync_out.mp4"},
        )
    except FileNotFoundError as e:
        abort(503, str(e))
    except subprocess.TimeoutExpired:
        abort(504, "Wav2Lip excedeu o tempo limite.")
    except Exception as e:
        abort(500, str(e))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    port = int(os.environ.get("LIPSYNC_PORT", "5001"))
    app.run(host="0.0.0.0", port=port, threaded=False)
