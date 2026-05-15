"""Root Cause Analysis engine — anomaly detection and pattern identification."""

import re
import json
from typing import Optional


class RCAEngine:
    """Root cause analysis engine that identifies patterns and anomalies.
    
    Capabilities:
    - Error spike detection
    - Dependency failure identification
    - Latency anomaly detection
    - Correlation vs causation analysis
    """

    # Known failure patterns
    FAILURE_PATTERNS = {
        "database_connection": {
            "keywords": ["connection refused", "connection reset", "connection timeout", "database", "db", "sql", "postgres", "mysql", "mongodb"],
            "root_cause_template": "Database connectivity failure — likely caused by {detail}",
            "severity": "critical",
        },
        "memory_exhaustion": {
            "keywords": ["out of memory", "oom", "heap", "memory limit", "gc overhead"],
            "root_cause_template": "Memory exhaustion — {detail}",
            "severity": "high",
        },
        "timeout": {
            "keywords": ["timeout", "timed out", "deadline exceeded", "read timeout", "connect timeout"],
            "root_cause_template": "Service timeout — {detail}",
            "severity": "high",
        },
        "authentication": {
            "keywords": ["401", "403", "unauthorized", "forbidden", "token expired", "invalid token", "auth"],
            "root_cause_template": "Authentication/authorization failure — {detail}",
            "severity": "medium",
        },
        "rate_limiting": {
            "keywords": ["429", "rate limit", "too many requests", "throttle"],
            "root_cause_template": "Rate limiting triggered — {detail}",
            "severity": "medium",
        },
        "disk_space": {
            "keywords": ["no space", "disk full", "write failed", "storage"],
            "root_cause_template": "Disk space exhaustion — {detail}",
            "severity": "critical",
        },
        "dns_resolution": {
            "keywords": ["dns", "name resolution", "unknown host", "nxdomain"],
            "root_cause_template": "DNS resolution failure — {detail}",
            "severity": "high",
        },
        "ssl_certificate": {
            "keywords": ["ssl", "certificate", "tls", "handshake"],
            "root_cause_template": "SSL/TLS certificate issue — {detail}",
            "severity": "high",
        },
        "dependency_failure": {
            "keywords": ["503", "502", "504", "upstream", "downstream", "service unavailable", "bad gateway", "gateway timeout"],
            "root_cause_template": "Dependency/upstream service failure — {detail}",
            "severity": "high",
        },
        "null_reference": {
            "keywords": ["nullpointer", "null reference", "none type", "undefined is not", "cannot read property"],
            "root_cause_template": "Null reference error in application code — {detail}",
            "severity": "medium",
        },
    }

    def analyze_patterns(self, log_entries: list[dict], error_patterns: dict) -> dict:
        """Analyze log entries for known failure patterns."""
        detected_patterns = []
        all_error_text = " ".join(
            e["message"].lower() for e in log_entries if e["level"] in ("ERROR", "FATAL", "CRITICAL")
        )

        for pattern_name, pattern_info in self.FAILURE_PATTERNS.items():
            matching_keywords = [kw for kw in pattern_info["keywords"] if kw in all_error_text]
            if matching_keywords:
                detected_patterns.append({
                    "pattern": pattern_name,
                    "matched_keywords": matching_keywords,
                    "severity": pattern_info["severity"],
                    "root_cause_hint": pattern_info["root_cause_template"].format(
                        detail=f"detected keywords: {', '.join(matching_keywords)}"
                    ),
                })

        # Sort by severity
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        detected_patterns.sort(key=lambda x: severity_order.get(x["severity"], 4))

        return {
            "detected_patterns": detected_patterns,
            "primary_pattern": detected_patterns[0] if detected_patterns else None,
            "pattern_count": len(detected_patterns),
        }

    def detect_error_spikes(self, log_entries: list[dict]) -> dict:
        """Detect sudden spikes in error rates."""
        errors_by_service = {}
        for entry in log_entries:
            if entry["level"] in ("ERROR", "FATAL", "CRITICAL"):
                svc = entry["service"]
                if svc not in errors_by_service:
                    errors_by_service[svc] = 0
                errors_by_service[svc] += 1

        total = len(log_entries)
        spikes = []
        for svc, count in errors_by_service.items():
            rate = count / total if total > 0 else 0
            if rate > 0.1:  # More than 10% error rate
                spikes.append({
                    "service": svc,
                    "error_count": count,
                    "error_rate": f"{rate * 100:.1f}%",
                    "is_spike": True,
                })

        return {"spikes": spikes, "has_spikes": len(spikes) > 0}

    def analyze_dependencies(self, log_entries: list[dict]) -> dict:
        """Identify dependency chain failures from log entries."""
        services_with_errors = set()
        dependency_hints = []

        for entry in log_entries:
            if entry["level"] in ("ERROR", "FATAL", "CRITICAL"):
                services_with_errors.add(entry["service"])
                msg = entry["message"].lower()
                # Detect upstream/downstream mentions
                for dep_kw in ["upstream", "downstream", "connection to", "calling", "request to", "from"]:
                    if dep_kw in msg:
                        dependency_hints.append({
                            "source_service": entry["service"],
                            "hint": entry["message"][:200],
                        })

        return {
            "services_with_errors": list(services_with_errors),
            "dependency_hints": dependency_hints[:10],
            "cascade_likely": len(services_with_errors) > 1,
        }

    def build_topology(self, log_entries: list[dict]) -> dict:
        """Build a visual dependency topology graph from logs."""
        nodes = []
        edges = []
        services = set()
        
        # Track service health and connections
        service_stats = {}
        connections = set()

        for entry in log_entries:
            svc = entry.get("service", "unknown")
            services.add(svc)
            
            if svc not in service_stats:
                service_stats[svc] = {"errors": 0, "total": 0}
            
            service_stats[svc]["total"] += 1
            if entry.get("level") in ("ERROR", "FATAL", "CRITICAL"):
                service_stats[svc]["errors"] += 1
            
            # Extract connections from messages
            msg = entry.get("message", "").lower()
            # Look for common patterns: "Request to [service]", "Calling [service]", etc.
            matches = re.findall(r"(?:request|call|connection) to ([\w-]+)", msg)
            for target in matches:
                if target != svc:
                    connections.add((svc, target))

        # Create nodes
        for svc in services:
            stats = service_stats.get(svc, {"errors": 0, "total": 1})
            error_rate = stats["errors"] / stats["total"] if stats["total"] > 0 else 0
            
            status = "healthy"
            if error_rate > 0.5: status = "critical"
            elif error_rate > 0.1: status = "warning"

            nodes.append({
                "id": svc,
                "label": svc,
                "status": status,
                "error_rate": f"{error_rate * 100:.1f}%",
                "type": "service"
            })

        # Create edges
        for source, target in connections:
            edges.append({
                "id": f"{source}-{target}",
                "source": source,
                "target": target,
                "type": "dependency"
            })

        return {"nodes": nodes, "edges": edges}

    def build_analysis_context(
        self,
        log_entries: list[dict],
        error_patterns: dict,
        metrics: Optional[list[dict]] = None,
    ) -> dict:
        """Build comprehensive analysis context from all signals."""
        pattern_analysis = self.analyze_patterns(log_entries, error_patterns)
        spike_analysis = self.detect_error_spikes(log_entries)
        dependency_analysis = self.analyze_dependencies(log_entries)
        topology = self.build_topology(log_entries)

        # Determine overall severity
        if pattern_analysis["primary_pattern"]:
            severity = pattern_analysis["primary_pattern"]["severity"]
        elif spike_analysis["has_spikes"]:
            severity = "high"
        elif error_patterns.get("error_count", 0) > 0:
            severity = "medium"
        else:
            severity = "low"

        return {
            "severity": severity,
            "pattern_analysis": pattern_analysis,
            "spike_analysis": spike_analysis,
            "dependency_analysis": dependency_analysis,
            "topology": topology,
            "error_summary": error_patterns,
            "metrics_context": metrics or [],
        }


rca_engine = RCAEngine()
