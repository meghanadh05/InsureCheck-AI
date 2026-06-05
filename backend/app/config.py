import logging
import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("uvicorn.error")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = PROJECT_ROOT / ".env"
load_dotenv(ENV_FILE, override=False)


class Settings(BaseSettings):
    app_name: str = "InsureCheck AI API"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///./insurecheck.db"
    openai_api_key: str = ""
    ai_provider: str = "fallback"
    groq_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    groq_model: str = "llama-3.1-8b-instant"
    openai_base_url: str = "https://api.openai.com/v1"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    frontend_origin: str = "http://localhost:3000"
    upload_dir: Path = Path("./uploads")
    policy_data_dir: Path = Path("app/data")

    base_dir: Path = Path(__file__).resolve().parent.parent

    model_config = SettingsConfigDict(env_file=str(ENV_FILE), extra="ignore")

    @property
    def data_dir(self) -> Path:
        candidates = [Path(self.policy_data_dir), Path("/app/data"), self.base_dir / "app" / "data"]
        for candidate in candidates:
            if candidate.exists():
                return candidate
        return Path(self.policy_data_dir)

    @property
    def resolved_upload_dir(self) -> Path:
        return Path(self.upload_dir)

    @property
    def cleaned_groq_api_key(self) -> str:
        return (os.getenv("GROQ_API_KEY", self.groq_api_key) or "").strip()

    @property
    def cleaned_openai_api_key(self) -> str:
        return (os.getenv("OPENAI_API_KEY", self.openai_api_key) or "").strip()

    @property
    def ai_key_configured(self) -> bool:
        return bool(self.cleaned_groq_api_key or self.cleaned_openai_api_key)

    @property
    def effective_ai_provider(self) -> str:
        if self.cleaned_groq_api_key:
            return "groq"
        if self.cleaned_openai_api_key:
            return "openai"
        return "fallback"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.effective_ai_provider == "groq":
        logger.info("AI extractor provider: groq")
    elif settings.effective_ai_provider == "openai":
        logger.info("AI extractor provider: openai")
    else:
        logger.info("No AI API key configured. Using fallback extractor.")
    return settings
