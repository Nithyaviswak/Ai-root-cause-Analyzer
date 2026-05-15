"""File upload API routes."""

import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import UploadResponse
from app.models.database import db
from app.services.ingestion import ingestion_service
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload a log file for ingestion into the vector store."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Read file content
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except Exception:
            raise HTTPException(status_code=400, detail="Unable to decode file content")

    # Parse and chunk
    entries = ingestion_service.parse_logs(text)
    chunks = ingestion_service.chunk_logs(entries)

    if not chunks:
        raise HTTPException(status_code=400, detail="No processable content found in file")

    # Determine document type from filename
    doc_type = "log"
    if any(kw in file.filename.lower() for kw in ["metric", "cpu", "memory", "latency"]):
        doc_type = "metric"
    elif any(kw in file.filename.lower() for kw in ["trace", "span"]):
        doc_type = "trace"

    # Add to vector store
    metadatas = [{"source": file.filename, "type": doc_type, "chunk_index": i} for i in range(len(chunks))]
    count = vector_store.add_documents(
        collection_name="logs",
        documents=chunks,
        metadatas=metadatas,
    )

    # Record in database
    await db.save_document(
        filename=file.filename,
        chunk_count=count,
        doc_type=doc_type,
    )

    return UploadResponse(
        filename=file.filename,
        document_count=count,
        message=f"Successfully ingested {count} chunks from {file.filename}",
    )
