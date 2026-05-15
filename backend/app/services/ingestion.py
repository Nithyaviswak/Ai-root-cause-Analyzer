"""Data ingestion service — parses logs, metrics, and traces into structured chunks."""

import re
import json
from datetime import datetime
from typing import Optional


class LogEntry:
    """Parsed log entry."""
    def __init__(self, timestamp: str, service: str, level: str, message: str, raw: str):
        self.timestamp = timestamp
        self.service = service
        self.level = level
        self.message = message
        self.raw = raw

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "service": self.service,
            "level": self.level,
            "message": self.message,
            "raw": self.raw,
        }


class IngestionService:
    """Parses raw logs, metrics, and traces into structured chunks."""

    # Common log patterns
    LOG_PATTERNS = [
        # ISO timestamp with service: 2024-01-15T10:23:45.123Z [service] ERROR message
        re.compile(
            r"(?P<timestamp>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[\.\d]*Z?)\s*"
            r"[\[\(]?(?P<service>[\w\-\.]+)[\]\)]?\s+"
            r"(?P<level>DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|CRITICAL)\s+"
            r"(?P<message>.*)",
            re.IGNORECASE,
        ),
        # Level-first: ERROR 2024-01-15 10:23:45 service-name message
        re.compile(
            r"(?P<level>DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|CRITICAL)\s+"
            r"(?P<timestamp>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[\.\d]*Z?)\s+"
            r"(?P<service>[\w\-\.]+)\s+"
            r"(?P<message>.*)",
            re.IGNORECASE,
        ),
        # Simple: [LEVEL] message
        re.compile(
            r"[\[\(]?(?P<level>DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|CRITICAL)[\]\)]?\s+"
            r"(?P<message>.*)",
            re.IGNORECASE,
        ),
    ]

    ERROR_INDICATORS = [
        "error", "exception", "failed", "failure", "timeout", "refused",
        "unavailable", "crash", "panic", "fatal", "critical", "denied",
        "rejected", "overflow", "leak", "deadlock", "corruption",
    ]

    def parse_logs(self, raw_text: str) -> list[dict]:
        """Parse raw log text into structured entries."""
        lines = raw_text.strip().split("\n")
        entries = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            entry = self._parse_log_line(line)
            entries.append(entry)

        return entries

    def _parse_log_line(self, line: str) -> dict:
        """Try to parse a single log line with known patterns."""
        for pattern in self.LOG_PATTERNS:
            match = pattern.match(line)
            if match:
                groups = match.groupdict()
                return {
                    "timestamp": groups.get("timestamp", ""),
                    "service": groups.get("service", "unknown"),
                    "level": groups.get("level", "INFO").upper(),
                    "message": groups.get("message", line),
                    "raw": line,
                }

        # Fallback: unstructured log
        level = "INFO"
        for indicator in self.ERROR_INDICATORS:
            if indicator in line.lower():
                level = "ERROR"
                break

        return {
            "timestamp": "",
            "service": "unknown",
            "level": level,
            "message": line,
            "raw": line,
        }

    def chunk_logs(self, entries: list[dict], chunk_size: int = 10) -> list[str]:
        """Group log entries into semantic chunks for embedding."""
        chunks = []
        for i in range(0, len(entries), chunk_size):
            batch = entries[i : i + chunk_size]
            chunk_text = "\n".join(e["raw"] for e in batch)
            chunks.append(chunk_text)
        return chunks

    def extract_error_patterns(self, entries: list[dict]) -> dict:
        """Extract error patterns and statistics from log entries."""
        errors = [e for e in entries if e["level"] in ("ERROR", "FATAL", "CRITICAL")]
        services_affected = list(set(e["service"] for e in errors if e["service"] != "unknown"))

        # Find error spikes (multiple errors in short time windows)
        error_count = len(errors)
        total_count = len(entries)
        error_rate = (error_count / total_count * 100) if total_count > 0 else 0

        # Extract unique error messages
        unique_errors = list(set(e["message"][:100] for e in errors))[:10]

        # Detect stack traces
        stack_traces = []
        current_trace = []
        for entry in entries:
            msg = entry["message"]
            if ("Traceback" in msg) or ("at " in msg and ("." in msg or "/" in msg)):
                current_trace.append(msg)
            elif current_trace:
                stack_traces.append("\n".join(current_trace))
                current_trace = []
        if current_trace:
            stack_traces.append("\n".join(current_trace))

        return {
            "total_entries": total_count,
            "error_count": error_count,
            "error_rate": f"{error_rate:.1f}%",
            "services_affected": services_affected,
            "unique_errors": unique_errors,
            "stack_traces": stack_traces[:5],
            "has_timeout": any("timeout" in e["message"].lower() for e in errors),
            "has_connection_error": any(
                "connection" in e["message"].lower() or "refused" in e["message"].lower()
                for e in errors
            ),
            "has_oom": any(
                "out of memory" in e["message"].lower() or "oom" in e["message"].lower()
                for e in errors
            ),
        }

    def parse_metrics(self, raw_text: str) -> list[dict]:
        """Parse metrics data (JSON or text format)."""
        try:
            data = json.loads(raw_text)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                return [data]
        except json.JSONDecodeError:
            pass

        # Try line-by-line key=value format
        metrics = []
        for line in raw_text.strip().split("\n"):
            parts = {}
            for segment in line.split():
                if "=" in segment:
                    key, val = segment.split("=", 1)
                    parts[key] = val
            if parts:
                metrics.append(parts)
        return metrics

    def parse_traces(self, raw_text: str) -> list[dict]:
        """Parse trace/span data."""
        try:
            data = json.loads(raw_text)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                return [data]
        except json.JSONDecodeError:
            pass
        return [{"raw_trace": raw_text}]

    def build_context(
        self,
        log_entries: list[dict],
        metrics: Optional[list[dict]] = None,
        traces: Optional[list[dict]] = None,
    ) -> str:
        """Build a combined context string from all data sources."""
        parts = []

        # Log summary
        patterns = self.extract_error_patterns(log_entries)
        parts.append(f"=== LOG ANALYSIS ===")
        parts.append(f"Total entries: {patterns['total_entries']}")
        parts.append(f"Error count: {patterns['error_count']} ({patterns['error_rate']})")
        parts.append(f"Services affected: {', '.join(patterns['services_affected']) or 'unknown'}")

        if patterns["unique_errors"]:
            parts.append(f"\nKey errors:")
            for err in patterns["unique_errors"]:
                parts.append(f"  - {err}")

        if patterns["has_timeout"]:
            parts.append("\n⚠ Timeout errors detected")
        if patterns["has_connection_error"]:
            parts.append("⚠ Connection errors detected")
        if patterns["has_oom"]:
            parts.append("⚠ Out-of-memory errors detected")

        # Raw error logs
        error_logs = [e for e in log_entries if e["level"] in ("ERROR", "FATAL", "CRITICAL")]
        if error_logs:
            parts.append(f"\n=== ERROR LOGS (showing {min(len(error_logs), 20)}) ===")
            for e in error_logs[:20]:
                parts.append(e["raw"])

        # Metrics
        if metrics:
            parts.append(f"\n=== METRICS ===")
            parts.append(json.dumps(metrics[:10], indent=2))

        # Traces
        if traces:
            parts.append(f"\n=== TRACES ===")
            parts.append(json.dumps(traces[:10], indent=2))

        return "\n".join(parts)


ingestion_service = IngestionService()
