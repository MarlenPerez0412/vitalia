import logging

from fastapi import APIRouter, File, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from app.schemas.voice import TranscriptionResponse, VoiceHealth
from app.services.audio_service import (
    ALLOWED_MIME_TYPES,
    AudioService,
    FfmpegUnavailableError,
    InvalidAudioError,
    normalize_mime,
)
from app.services.vosk_service import VoskService, VoskUnavailableError

logger = logging.getLogger("vitalia.voice")
router = APIRouter(prefix="/api/voice", tags=["voice"])


def error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"success": False, "error": code, "message": message})


@router.get("/health", response_model=VoiceHealth, response_model_by_alias=True)
def voice_health(request: Request) -> VoiceHealth:
    vosk: VoskService = request.app.state.vosk
    audio: AudioService = request.app.state.audio
    ready = vosk.loaded
    return VoiceHealth(
        status="ok" if ready else "degraded",
        vosk_model_loaded=ready,
        ffmpeg_available=audio.ffmpeg_available,
        model_name=vosk.model_path.name,
        detail=None if ready else (vosk.load_error or "El modelo Vosk aun no esta cargado"),
    )


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    response_model_by_alias=True,
    responses={400: {}, 413: {}, 415: {}, 503: {}},
)
async def transcribe(request: Request, audio: UploadFile | None = File(default=None)):
    """Audio -> PCM 16 kHz mono -> Vosk -> texto. El audio solo existe en memoria durante la peticion."""
    logger.info(">>> PETICION DE TRANSCRIPCION recibida")

    if audio is None:
        logger.warning(">>> ERROR: campo 'audio' ausente")
        return error(400, "AUDIO_REQUIRED", "Falta el archivo de audio en el campo 'audio'.")
    mime_type = normalize_mime(audio.content_type)
    logger.info(">>> FORMATO recibido: %s", mime_type or "desconocido")
    if mime_type not in ALLOWED_MIME_TYPES:
        logger.warning(">>> ERROR: formato no permitido: %s", mime_type)
        return error(415, "UNSUPPORTED_MEDIA_TYPE", f"Formato de audio no permitido: {mime_type or 'desconocido'}.")

    settings = request.app.state.settings
    data = await audio.read(settings.max_upload_bytes + 1)
    await audio.close()
    if not data:
        logger.warning(">>> ERROR: archivo de audio vacio")
        return error(400, "EMPTY_AUDIO", "El archivo de audio esta vacio.")
    if len(data) > settings.max_upload_bytes:
        logger.warning(">>> ERROR: audio demasiado grande (%d bytes)", len(data))
        return error(413, "AUDIO_TOO_LARGE", f"El audio supera el limite de {settings.max_upload_mb:g} MB.")

    logger.info(">>> AUDIO recibido: %d bytes (%.1f KB)", len(data), len(data) / 1024)

    vosk: VoskService = request.app.state.vosk
    if not vosk.loaded:
        logger.warning(">>> ERROR: modelo Vosk no cargado")
        return error(503, "MODEL_NOT_LOADED", "El reconocimiento de voz no esta disponible en este momento.")

    try:
        pcm = await run_in_threadpool(request.app.state.audio.to_pcm, data, mime_type)
        del data
        logger.info(">>> PCM generado: %d bytes (%.1f s de audio)", len(pcm), len(pcm) / 2 / 16000)
        text = await run_in_threadpool(vosk.transcribe_pcm, pcm)
    except FfmpegUnavailableError as exc:
        logger.error(">>> ERROR: FFmpeg no disponible para %s", mime_type)
        return error(503, "FFMPEG_UNAVAILABLE", str(exc))
    except InvalidAudioError as exc:
        logger.error(">>> ERROR: audio invalido: %s", exc)
        return error(400, "INVALID_AUDIO", str(exc))
    except VoskUnavailableError:
        logger.error(">>> ERROR: Vosk no disponible")
        return error(503, "MODEL_NOT_LOADED", "El reconocimiento de voz no esta disponible en este momento.")

    if text:
        logger.info(">>> VOSK ESCUCHO: '%s'", text)
    else:
        logger.warning(">>> VOSK NO RECONOCIO NADA (texto vacio) - posible silencio, voz baja o idioma incorrecto")

    return TranscriptionResponse(text=text)
