from functools import lru_cache
from typing import Annotated
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Configuracion desde variables de entorno o `backend/.env`. Las rutas relativas se resuelven desde `backend/`."""

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    vosk_model_path: Path = Path("models/vosk-model-es-0.42")
    vosk_sample_rate: int = 16000
    ffmpeg_binary: str = "ffmpeg"
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:4200"]
    max_upload_mb: float = 10
    load_model_on_startup: bool = True
    temp_dir: Path = Path("temp")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        # Permite CORS_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
        if isinstance(value, str) and not value.strip().startswith("["):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def resolved_model_path(self) -> Path:
        return self.vosk_model_path if self.vosk_model_path.is_absolute() else BACKEND_DIR / self.vosk_model_path

    @property
    def resolved_temp_dir(self) -> Path:
        return self.temp_dir if self.temp_dir.is_absolute() else BACKEND_DIR / self.temp_dir

    @property
    def max_upload_bytes(self) -> int:
        return int(self.max_upload_mb * 1024 * 1024)


@lru_cache
def get_settings() -> Settings:
    return Settings()
