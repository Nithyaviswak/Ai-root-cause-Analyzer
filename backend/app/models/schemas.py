"""Pydantic schemas for API request/response models."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ── Request Models ──────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    """Request to analyze logs/metrics/traces."""
    logs: str = Field(default="", description="Raw log text to analyze")
    metrics: Optional[str] = Field(default=None, description="Metrics data (JSON or text)")
    traces: Optional[str] = Field(default=None, description="Trace data (JSON or text)")
    context: Optional[str] = Field(default=None, description="Additional context about the incident")


class ChatMessage(BaseModel):
    """A single chat message."""
    role: str = Field(description="Role: 'user' or 'assistant'")
    content: str = Field(description="Message content")


class ChatRequest(BaseModel):
    """Chat-style analysis request."""
    message: str = Field(description="User message with logs or questions")
    history: list[ChatMessage] = Field(default_factory=list, description="Conversation history")


# ── Response Models ─────────────────────────────────────────────

class AnalysisResponse(BaseModel):
    """Structured root cause analysis output."""
    detected_issue: str = Field(description="Summary of the detected issue")
    severity: Severity = Field(description="Severity level")
    affected_services: list[str] = Field(default_factory=list, description="List of affected services")
    root_cause: str = Field(description="Root cause determination")
    evidence: list[str] = Field(default_factory=list, description="Evidence supporting the analysis")
    confidence_score: str = Field(description="Confidence score (0-100%)")
    suggested_fix: str = Field(description="Recommended fix")
    improved_code: Optional[str] = Field(default=None, description="Clean, revised code demonstrating the fix if applicable")
    preventive_measures: str = Field(description="Steps to prevent recurrence")
    topology: Optional[dict] = Field(default=None, description="Visual dependency topology (nodes/edges)")
    sre_workflow: Optional[dict] = Field(default=None, description="Detailed SRE workflow steps")


class UploadResponse(BaseModel):
    """Response after uploading a file."""
    filename: str
    document_count: int
    message: str


class HistoryItem(BaseModel):
    """A past analysis record."""
    id: str
    timestamp: str
    input_summary: str
    severity: str
    detected_issue: str
    confidence_score: str


class HistoryDetail(BaseModel):
    """Full analysis record with result."""
    id: str
    timestamp: str
    input_summary: str
    result: AnalysisResponse


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str
    services: dict[str, str]
