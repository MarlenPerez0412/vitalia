from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class VoiceHealth(CamelModel):
    status: str
    vosk_model_loaded: bool
    ffmpeg_available: bool
    model_name: str
    detail: str | None = None


class TranscriptionResponse(CamelModel):
    success: bool = True
    text: str
