import io
import logging
import os
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

logger = logging.getLogger("vitalia.audio")

FFMPEG_INSTALL_HINT = (
    "FFmpeg no esta instalado o no esta en el PATH. En Windows: `winget install Gyan.FFmpeg` "
    "(o descargarlo de https://ffmpeg.org) y reiniciar la terminal; comprobar con `ffmpeg -version`. "
    "Tambien puede indicarse la ruta con FFMPEG_BINARY en backend/.env."
)
ALLOWED_MIME_TYPES = {"audio/webm", "audio/wav", "audio/x-wav", "audio/wave", "audio/ogg", "audio/mp4"}
WAV_MIME_TYPES = {"audio/wav", "audio/x-wav", "audio/wave"}
SUFFIXES = {"audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mp4": ".m4a"}


class AudioError(Exception):
    """Error de audio con un mensaje apto para mostrarse al cliente."""


class InvalidAudioError(AudioError):
    pass


class FfmpegUnavailableError(AudioError):
    pass


def normalize_mime(content_type: str | None) -> str:
    """`audio/webm;codecs=opus` -> `audio/webm`."""
    return (content_type or "").split(";")[0].strip().lower()


class AudioService:
    """Normaliza el audio recibido a PCM 16 bit, mono, 16 kHz. Nada se conserva tras la peticion."""

    def __init__(self, ffmpeg_binary: str, temp_dir: Path, sample_rate: int = 16000, timeout_s: int = 30) -> None:
        self.ffmpeg_binary = ffmpeg_binary
        self.temp_dir = temp_dir
        self.sample_rate = sample_rate
        self.timeout_s = timeout_s

    def ffmpeg_path(self) -> str | None:
        # Se consulta en cada uso para detectar una instalacion posterior sin reiniciar el servidor.
        return shutil.which(self.ffmpeg_binary)

    @property
    def ffmpeg_available(self) -> bool:
        return self.ffmpeg_path() is not None

    def to_pcm(self, data: bytes, mime_type: str) -> bytes:
        if mime_type in WAV_MIME_TYPES:
            pcm = self._read_native_wav(data)
            if pcm is not None:
                return pcm
        return self._convert_with_ffmpeg(data, mime_type)

    def _read_native_wav(self, data: bytes) -> bytes | None:
        """WAV que ya esta en el formato de Vosk: se usa sin FFmpeg. Devuelve None si requiere conversion."""
        try:
            with wave.open(io.BytesIO(data), "rb") as wav:
                if wav.getnchannels() == 1 and wav.getsampwidth() == 2 and wav.getframerate() == self.sample_rate:
                    return wav.readframes(wav.getnframes())
                return None
        except (wave.Error, EOFError) as error:
            if not self.ffmpeg_available:
                raise InvalidAudioError("No pude leer el archivo WAV.") from error
            return None

    def _convert_with_ffmpeg(self, data: bytes, mime_type: str) -> bytes:
        binary = self.ffmpeg_path()
        if binary is None:
            raise FfmpegUnavailableError(FFMPEG_INSTALL_HINT)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        fd, source = tempfile.mkstemp(dir=self.temp_dir, prefix="voice-", suffix=SUFFIXES.get(mime_type, ".wav"))
        try:
            with os.fdopen(fd, "wb") as handle:
                handle.write(data)
            command = [binary, "-hide_banner", "-loglevel", "error", "-nostdin", "-i", source,
                       "-ac", "1", "-ar", str(self.sample_rate), "-acodec", "pcm_s16le", "-f", "s16le", "pipe:1"]
            result = subprocess.run(command, capture_output=True, timeout=self.timeout_s, check=False)
            if result.returncode != 0 or not result.stdout:
                logger.warning("FFmpeg no pudo convertir el audio (%s, codigo %s)", mime_type, result.returncode)
                raise InvalidAudioError("No pude leer el audio recibido.")
            return result.stdout
        except subprocess.TimeoutExpired as error:
            raise InvalidAudioError("La conversion del audio tardo demasiado.") from error
        finally:
            Path(source).unlink(missing_ok=True)
