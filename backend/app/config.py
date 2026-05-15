"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    # App
    APP_NAME: str = "AI Root Cause Analyzer"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Google Gemini
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Embeddings
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    FINETUNED_MODEL_PATH: str = ""

    # ChromaDB
    CHROMA_PERSIST_DIR: str = str(Path(__file__).parent.parent / "chroma_data")

    # RAGFlow (optional)
    RAGFLOW_API_URL: str = ""
    RAGFLOW_API_KEY: str = ""
    RAGFLOW_DATASET_ID: str = ""

    # Database
    DATABASE_URL: str = str(Path(__file__).parent.parent / "data" / "analyzer.db")

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    model_config = {
        "env_file": os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
