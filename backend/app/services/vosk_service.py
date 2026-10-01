import json
import logging
import os
import sys
import threading
import time
from pathlib import Path

logger = logging.getLogger("vitalia.vosk")

REQUIRED_MODEL_DIRS = ("am", "conf", "graph", "ivector")
CHUNK_BYTES = 8000  # 4000 muestras de 16 bit


def kaldi_compatible_path(path: Path) -> str:
    """Kaldi abre rutas con la API ANSI de Windows y falla con caracteres no ASCII (p. ej. `Vitalía`).
    Se usa la ruta relativa al directorio actual o, si no, el nombre corto 8.3 de Windows."""
    text = str(path)
    if sys.platform != "win32" or text.isascii():
        return text
    try:
        relative = os.path.relpath(path)
        if relative.isascii():
            return relative
    except ValueError:  # distinta unidad
        pass
    import ctypes

    buffer = ctypes.create_unicode_buffer(1024)
    if ctypes.windll.kernel32.GetShortPathNameW(text, buffer, len(buffer)) and buffer.value.isascii():
        return buffer.value
    return text


class VoskUnavailableError(RuntimeError):
    """El modelo no esta cargado o no es valido."""


class VoskService:
    """Carga el modelo Vosk una sola vez por proceso y lo reutiliza; crea un reconocedor por peticion."""

    def __init__(self, model_path: Path, sample_rate: int = 16000) -> None:
        self.model_path = model_path
        self.sample_rate = sample_rate
        self._model = None
        self._lock = threading.Lock()
        self.load_error: str | None = None

    @property
    def loaded(self) -> bool:
        return self._model is not None

    def validate_model_path(self) -> None:
        if not self.model_path.is_dir():
            raise VoskUnavailableError(f"No existe la carpeta del modelo Vosk: {self.model_path}")
        missing = [name for name in REQUIRED_MODEL_DIRS if not (self.model_path / name).is_dir()]
        if missing:
            raise VoskUnavailableError(f"El modelo Vosk no tiene una estructura valida (faltan: {', '.join(missing)})")

    def load(self) -> None:
        with self._lock:
            if self._model is not None:
                return
            try:
                self.validate_model_path()
                from vosk import Model, SetLogLevel

                SetLogLevel(-1)
                started = time.perf_counter()
                logger.info("Cargando modelo Vosk desde %s", self.model_path.name)
                self._model = Model(kaldi_compatible_path(self.model_path))
                self.load_error = None
                logger.info("Modelo Vosk cargado en %.1f s", time.perf_counter() - started)
            except Exception as error:  # el servidor sigue vivo; /api/voice/health informa el fallo
                self.load_error = str(error)
                logger.error("No se pudo cargar el modelo Vosk: %s", error)

    def transcribe_pcm(self, pcm: bytes) -> str:
        """Transcribe PCM 16 bit mono a `sample_rate` Hz. Devuelve texto limpio o cadena vacia."""
        if self._model is None:
            raise VoskUnavailableError(self.load_error or "El modelo Vosk no esta cargado")
        from vosk import KaldiRecognizer

        recognizer = KaldiRecognizer(self._model, self.sample_rate)
        recognizer.SetWords(False)
        parts: list[str] = []
        for offset in range(0, len(pcm), CHUNK_BYTES):
            if recognizer.AcceptWaveform(pcm[offset:offset + CHUNK_BYTES]):
                parts.append(json.loads(recognizer.Result()).get("text", ""))
        parts.append(json.loads(recognizer.FinalResult()).get("text", ""))
        text = " ".join(" ".join(part.split()) for part in parts if part.strip())
        # Solo metadatos: nunca se registra el contenido transcrito.
        logger.info("Transcripcion completada: %.1f s de audio, %d palabras", len(pcm) / 2 / self.sample_rate, len(text.split()))
        return text
