"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.database import db
from app.services.embedding import embedding_service
from app.services.vector_store import vector_store
from app.services.gemini_llm import gemini_llm
from app.services.ragflow_client import ragflow_client
from app.routes import analyze, upload, history, voice

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Initialize database
    await db.connect()
    logger.info("Database connected")

    # Load embedding model
    embedding_service.load_model()
    logger.info("Embedding model loaded")

    # Initialize vector store
    vector_store.initialize()
    logger.info("Vector store initialized")

    # Configure Gemini LLM
    gemini_llm.configure()
    logger.info(f"Gemini LLM configured: {gemini_llm.is_configured}")

    # Check RAGFlow availability
    ragflow_available = await ragflow_client.check_health()
    logger.info(f"RAGFlow available: {ragflow_available}")

    yield

    # Shutdown
    logger.info("Shutting down...")
    await db.disconnect()


# ── Create App ──

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-grade RAG-based AI Root Cause Analyzer simulating an SRE engineer",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(analyze.router)
app.include_router(upload.router)
app.include_router(history.router)
app.include_router(voice.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    stats = vector_store.get_collection_stats()
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "services": {
            "database": "connected",
            "embeddings": "loaded",
            "vector_store": f"active ({sum(s['count'] for s in stats.values())} docs)",
            "gemini_llm": "configured" if gemini_llm.is_configured else "demo_mode",
            "ragflow": "connected" if ragflow_client.is_available() else "not_configured",
        },
    }
