import io
import os
import subprocess
import sys
import wave
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.services.audio_service import AudioService, FfmpegUnavailableError


def wav_bytes(seconds: float = 0.5, rate: int = 16000, channels: int = 1) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(b"\x00\x00" * int(seconds * rate) * channels)
    return buffer.getvalue()


@pytest.fixture
def client(tmp_path: Path):
    settings = Settings(load_model_on_startup=False, temp_dir=tmp_path, ffmpeg_binary="ffmpeg-no-existe")
    with TestClient(create_app(settings)) as test_client:
        yield test_client


def test_backend_health(client: TestClient):
    assert client.get("/health").json() == {"status": "ok"}


def test_voice_health_reports_components(client: TestClient):
    body = client.get("/api/voice/health").json()
    assert body["voskModelLoaded"] is False
    assert body["ffmpegAvailable"] is False
    assert body["status"] == "degraded"


def test_transcribe_endpoint_requires_audio(client: TestClient):
    response = client.post("/api/voice/transcribe")
    assert response.status_code == 400
    assert response.json()["error"] == "AUDIO_REQUIRED"


def test_rejects_disallowed_mime(client: TestClient):
    response = client.post("/api/voice/transcribe", files={"audio": ("x.txt", b"hola", "text/plain")})
    assert response.status_code == 415


def test_rejects_empty_file(client: TestClient):
    response = client.post("/api/voice/transcribe", files={"audio": ("x.webm", b"", "audio/webm;codecs=opus")})
    assert response.status_code == 400
    assert response.json()["error"] == "EMPTY_AUDIO"


def test_rejects_oversized_file(tmp_path: Path):
    settings = Settings(load_model_on_startup=False, temp_dir=tmp_path, max_upload_mb=0.001)
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/voice/transcribe", files={"audio": ("x.wav", b"0" * 4096, "audio/wav")})
    assert response.status_code == 413


def test_returns_503_when_model_not_loaded(client: TestClient):
    response = client.post("/api/voice/transcribe", files={"audio": ("x.wav", wav_bytes(), "audio/wav")})
    assert response.status_code == 503
    assert response.json()["error"] == "MODEL_NOT_LOADED"


def test_audio_service_invalid_wav_and_missing_ffmpeg(tmp_path: Path):
    from app.services.audio_service import InvalidAudioError

    service = AudioService("ffmpeg-no-existe", tmp_path)
    with pytest.raises(InvalidAudioError):
        service.to_pcm(b"RIFF-no-es-wav", "audio/wav")
    with pytest.raises(FfmpegUnavailableError):
        service.to_pcm(b"webm", "audio/webm")
    # WAV ya normalizado: no necesita FFmpeg.
    assert len(service.to_pcm(wav_bytes(0.5), "audio/wav")) == 16000
    assert list(tmp_path.iterdir()) == []


def test_resamples_with_ffmpeg_and_cleans_temp_files(tmp_path: Path):
    service = AudioService("ffmpeg", tmp_path)
    if not service.ffmpeg_available:
        pytest.skip("FFmpeg no instalado")
    pcm = service.to_pcm(wav_bytes(1, rate=44100, channels=2), "audio/wav")
    assert abs(len(pcm) - 32000) < 400
    assert list(tmp_path.iterdir()) == []


# --- Integracion con el modelo real (lento: carga ~2.3 GB) ---------------------------------------------

requires_model = pytest.mark.skipif(os.environ.get("VITALIA_VOSK_IT") != "1", reason="definir VITALIA_VOSK_IT=1 para cargar el modelo real")


def synthesize_spanish(path: Path, text: str) -> bool:
    """Voz sintetica es-MX con SAPI (solo Windows) convertida a 16 kHz mono 16 bit."""
    if sys.platform != "win32":
        return False
    script = (
        "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$v = $s.GetInstalledVoices() | ? { $_.VoiceInfo.Culture.Name -like 'es-*' } | select -First 1; if (-not $v) { exit 2 }; "
        "$s.SelectVoice($v.VoiceInfo.Name); $f = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, 'Sixteen', 'Mono'); "
        f"$s.SetOutputToWaveFile('{path}', $f); $s.Speak('{text}'); $s.Dispose()"
    )
    return subprocess.run(["powershell", "-NoProfile", "-Command", script], capture_output=True, check=False).returncode == 0


@requires_model
def test_real_model_transcribes_speech_and_silence(tmp_path: Path):
    with TestClient(create_app(Settings(load_model_on_startup=False, temp_dir=tmp_path))) as client:
        client.app.state.vosk.load()
        assert client.get("/api/voice/health").json()["voskModelLoaded"] is True

        silence = client.post("/api/voice/transcribe", files={"audio": ("s.wav", wav_bytes(1), "audio/wav")})
        assert silence.json() == {"success": True, "text": ""}

        sample = tmp_path / "frase.wav"
        if not synthesize_spanish(sample, "Qué medicamento me toca"):
            pytest.skip("Sin voz es-* de Windows para generar audio")
        speech = client.post("/api/voice/transcribe", files={"audio": ("f.wav", sample.read_bytes(), "audio/wav")})
        sample.unlink()
        assert speech.status_code == 200
        assert "medicamento" in speech.json()["text"]
