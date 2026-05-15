"""SQLite database for storing analysis history."""

import aiosqlite
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from app.config import settings


class Database:
    """Async SQLite database for analysis history."""

    def __init__(self):
        self.db_path = settings.DATABASE_URL
        self._connection: aiosqlite.Connection | None = None

    async def connect(self):
        """Initialize database connection and create tables."""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._connection = await aiosqlite.connect(self.db_path)
        self._connection.row_factory = aiosqlite.Row
        await self._create_tables()

    async def _create_tables(self):
        """Create required tables if they don't exist."""
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                input_summary TEXT NOT NULL,
                input_full TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'medium',
                detected_issue TEXT NOT NULL DEFAULT '',
                confidence_score TEXT NOT NULL DEFAULT '0%',
                result_json TEXT NOT NULL
            )
        """)
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS uploaded_documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                uploaded_at TEXT NOT NULL,
                chunk_count INTEGER NOT NULL DEFAULT 0,
                doc_type TEXT NOT NULL DEFAULT 'log'
            )
        """)
        await self._connection.commit()

    async def save_analysis(self, input_text: str, result: dict) -> str:
        """Save an analysis result and return its ID."""
        analysis_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now(timezone.utc).isoformat()
        input_summary = input_text[:200].replace("\n", " ")

        await self._connection.execute(
            """INSERT INTO analyses (id, timestamp, input_summary, input_full, severity, detected_issue, confidence_score, result_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                analysis_id,
                timestamp,
                input_summary,
                input_text,
                result.get("severity", "medium"),
                result.get("detected_issue", ""),
                result.get("confidence_score", "0%"),
                json.dumps(result),
            ),
        )
        await self._connection.commit()
        return analysis_id

    async def get_history(self, limit: int = 50) -> list[dict]:
        """Get recent analysis history."""
        cursor = await self._connection.execute(
            "SELECT id, timestamp, input_summary, severity, detected_issue, confidence_score FROM analyses ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def get_analysis(self, analysis_id: str) -> dict | None:
        """Get a specific analysis by ID."""
        cursor = await self._connection.execute(
            "SELECT id, timestamp, input_summary, input_full, result_json FROM analyses WHERE id = ?",
            (analysis_id,),
        )
        row = await cursor.fetchone()
        if row:
            data = dict(row)
            data["result"] = json.loads(data.pop("result_json"))
            data.pop("input_full", None)
            return data
        return None

    async def save_document(self, filename: str, chunk_count: int, doc_type: str = "log") -> str:
        """Record an uploaded document."""
        doc_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now(timezone.utc).isoformat()
        await self._connection.execute(
            "INSERT INTO uploaded_documents (id, filename, uploaded_at, chunk_count, doc_type) VALUES (?, ?, ?, ?, ?)",
            (doc_id, filename, timestamp, chunk_count, doc_type),
        )
        await self._connection.commit()
        return doc_id

    async def disconnect(self):
        """Close database connection."""
        if self._connection:
            await self._connection.close()


db = Database()
