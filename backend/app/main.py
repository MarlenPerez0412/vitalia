import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.voice import router as voice_router
from app.core.config import Settings, get_settings
from app.services.audio_service import AudioService
from app.services.vosk_service import VoskService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("vitalia")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        audio: AudioService = app.state.audio
        if not audio.ffmpeg_available:
            logger.warning("FFmpeg no disponible: solo se aceptara WAV PCM 16 kHz mono. Ver /api/voice/health.")
        if settings.load_model_on_startup:
            # Carga en segundo plano: el servidor responde de inmediato y /api/voice/health indica cuando esta listo.
            threading.Thread(target=app.state.vosk.load, name="vosk-loader", daemon=True).start()
        yield

    app = FastAPI(title="VITALIA API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.vosk = VoskService(settings.resolved_model_path, settings.vosk_sample_rate)
    app.state.audio = AudioService(settings.ffmpeg_binary, settings.resolved_temp_dir, settings.vosk_sample_rate)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    app.include_router(voice_router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
