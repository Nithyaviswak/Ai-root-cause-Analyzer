"""DevOps Simulation Engine — orchestrates the 5-step SRE analysis workflow."""

import json
import logging
from typing import AsyncGenerator
from app.services.ingestion import ingestion_service
from app.services.embedding import embedding_service
from app.services.vector_store import vector_store
from app.services.trag import trag_engine
from app.services.rca_engine import rca_engine
from app.services.gemini_llm import gemini_llm

logger = logging.getLogger(__name__)


class SRESimulator:
    """Simulates an SRE workflow for root cause analysis.
    
    5-Step Workflow:
    1. Identify affected service
    2. Trace dependency chain
    3. Correlate logs + metrics
    4. Compare with historical incidents
    5. Suggest fix
    """

    async def run_analysis(
        self,
        logs: str,
        metrics: str | None = None,
        traces: str | None = None,
        context: str | None = None,
    ) -> dict:
        """Execute the full SRE analysis pipeline."""
        workflow = {}

        # ── Step 1: Identify affected service ──
        logger.info("SRE Step 1: Identifying affected services...")
        log_entries = ingestion_service.parse_logs(logs)
        error_patterns = ingestion_service.extract_error_patterns(log_entries)

        workflow["step1_identify"] = {
            "title": "Identify Affected Services",
            "services": error_patterns["services_affected"],
            "error_count": error_patterns["error_count"],
            "total_entries": error_patterns["total_entries"],
        }

        # ── Step 2: Trace dependency chain ──
        logger.info("SRE Step 2: Tracing dependency chain...")
        dep_analysis = rca_engine.analyze_dependencies(log_entries)

        workflow["step2_dependencies"] = {
            "title": "Trace Dependency Chain",
            "services_with_errors": dep_analysis["services_with_errors"],
            "cascade_likely": dep_analysis["cascade_likely"],
            "dependency_hints": dep_analysis["dependency_hints"][:5],
        }

        # ── Step 3: Correlate logs + metrics ──
        logger.info("SRE Step 3: Correlating logs and metrics...")
        parsed_metrics = ingestion_service.parse_metrics(metrics) if metrics else []
        parsed_traces = ingestion_service.parse_traces(traces) if traces else []

        full_context = ingestion_service.build_context(log_entries, parsed_metrics, parsed_traces)

        # Add RCA engine analysis
        rca_result = rca_engine.build_analysis_context(log_entries, error_patterns, parsed_metrics)

        workflow["step3_correlate"] = {
            "title": "Correlate Logs + Metrics",
            "severity": rca_result["severity"],
            "pattern_analysis": rca_result["pattern_analysis"],
            "spike_analysis": rca_result["spike_analysis"],
        }

        # ── Step 4: Compare with historical incidents ──
        logger.info("SRE Step 4: Comparing with historical incidents...")
        error_summary = "; ".join(error_patterns["unique_errors"][:3])
        retrieval_results = await trag_engine.retrieve(
            query=error_summary or "system error analysis",
            top_k=3,
        )

        workflow["step4_historical"] = {
            "title": "Compare Historical Incidents",
            "similar_incidents_found": len(retrieval_results.get("results", {}).get("incidents", [])),
            "sources_checked": retrieval_results["sources_used"],
            "retrieval_context": retrieval_results["context"][:500],
        }

        # ── Step 5: Suggest fix (Gemini LLM) ──
        logger.info("SRE Step 5: Generating fix suggestions via Gemini...")

        # Build enhanced prompt with all context
        enhanced_context = f"""{full_context}

=== RCA ENGINE ANALYSIS ===
Primary Pattern: {json.dumps(rca_result['pattern_analysis'].get('primary_pattern'), default=str)}
Severity Assessment: {rca_result['severity']}
Cascade Detected: {dep_analysis['cascade_likely']}

=== RETRIEVED CONTEXT (Similar Past Incidents) ===
{retrieval_results['context'][:1000]}
"""
        if context:
            enhanced_context += f"\n=== ADDITIONAL USER CONTEXT ===\n{context}"

        analysis_result = await gemini_llm.analyze(enhanced_context, query=error_summary)

        # Merge topology results
        topology = rca_result.get("topology", {"nodes": [], "edges": []})
        ai_hints = analysis_result.get("topology_hints", {})
        
        if ai_hints:
            # Simple merge: add unique nodes/edges from AI
            node_ids = {n["id"] for n in topology["nodes"]}
            for node in ai_hints.get("nodes", []):
                if node["id"] not in node_ids:
                    topology["nodes"].append(node)
            
            edge_ids = {f"{e['source']}-{e['target']}" for e in topology["edges"]}
            for edge in ai_hints.get("edges", []):
                eid = f"{edge['source']}-{edge['target']}"
                if eid not in edge_ids:
                    topology["edges"].append(edge)

        analysis_result["topology"] = topology
        analysis_result["sre_workflow"] = workflow

        # Store in vector DB for future reference
        try:
            log_chunks = ingestion_service.chunk_logs(log_entries)
            if log_chunks:
                vector_store.add_documents(
                    collection_name="logs",
                    documents=log_chunks[:10],
                    metadatas=[{"severity": rca_result["severity"]}] * min(len(log_chunks), 10),
                )

            # Store this incident
            incident_doc = f"Issue: {analysis_result.get('detected_issue', '')}. Root cause: {analysis_result.get('root_cause', '')}. Fix: {analysis_result.get('suggested_fix', '')}"
            vector_store.add_documents(
                collection_name="incidents",
                documents=[incident_doc],
                metadatas=[{"severity": analysis_result.get("severity", "medium")}],
            )
        except Exception as e:
            logger.warning(f"Failed to store in vector DB: {e}")

        return analysis_result

    async def run_analysis_stream(
        self,
        logs: str,
        metrics: str | None = None,
        traces: str | None = None,
        context: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream the SRE analysis process with step-by-step updates."""

        # Step 1
        yield json.dumps({"step": 1, "title": "Identifying affected services...", "type": "progress"})
        log_entries = ingestion_service.parse_logs(logs)
        error_patterns = ingestion_service.extract_error_patterns(log_entries)

        yield json.dumps({
            "step": 1, "title": "Affected Services Identified", "type": "step_complete",
            "data": {"services": error_patterns["services_affected"], "error_count": error_patterns["error_count"]},
        })

        # Step 2
        yield json.dumps({"step": 2, "title": "Tracing dependency chain...", "type": "progress"})
        dep_analysis = rca_engine.analyze_dependencies(log_entries)

        yield json.dumps({
            "step": 2, "title": "Dependencies Traced", "type": "step_complete",
            "data": {"cascade_likely": dep_analysis["cascade_likely"], "services": dep_analysis["services_with_errors"]},
        })

        # Step 3
        yield json.dumps({"step": 3, "title": "Correlating logs and metrics...", "type": "progress"})
        parsed_metrics = ingestion_service.parse_metrics(metrics) if metrics else []
        full_context = ingestion_service.build_context(log_entries, parsed_metrics)
        rca_result = rca_engine.build_analysis_context(log_entries, error_patterns, parsed_metrics)

        yield json.dumps({
            "step": 3, "title": "Correlation Complete", "type": "step_complete",
            "data": {"severity": rca_result["severity"], "patterns": rca_result["pattern_analysis"]["pattern_count"]},
        })

        # Step 4
        yield json.dumps({"step": 4, "title": "Searching historical incidents...", "type": "progress"})
        error_summary = "; ".join(error_patterns["unique_errors"][:3])
        retrieval_results = await trag_engine.retrieve(query=error_summary or "system error", top_k=3)

        yield json.dumps({
            "step": 4, "title": "Historical Search Complete", "type": "step_complete",
            "data": {"sources_used": retrieval_results["sources_used"]},
        })

        # Step 5 — Stream Gemini response
        yield json.dumps({"step": 5, "title": "AI generating root cause analysis...", "type": "progress"})

        enhanced_context = f"""{full_context}

=== RCA ENGINE ===
Primary Pattern: {json.dumps(rca_result['pattern_analysis'].get('primary_pattern'), default=str)}
Severity: {rca_result['severity']}

=== SIMILAR INCIDENTS ===
{retrieval_results['context'][:1000]}
"""

        full_response = ""
        async for chunk in gemini_llm.analyze_stream(enhanced_context, query=error_summary):
            full_response += chunk
            yield json.dumps({"step": 5, "type": "llm_chunk", "content": chunk})

        # Parse final result
        try:
            result = gemini_llm._parse_response(full_response)
        except Exception:
            result = {"detected_issue": "Analysis complete", "root_cause": full_response}

        # Merge topology results
        topology = rca_result.get("topology", {"nodes": [], "edges": []})
        ai_hints = result.get("topology_hints", {})
        
        if ai_hints:
            node_ids = {n["id"] for n in topology["nodes"]}
            for node in ai_hints.get("nodes", []):
                if node["id"] not in node_ids:
                    topology["nodes"].append(node)
            
            edge_ids = {f"{e['source']}-{e['target']}" for e in topology["edges"]}
            for edge in ai_hints.get("edges", []):
                eid = f"{edge['source']}-{edge['target']}"
                if eid not in edge_ids:
                    topology["edges"].append(edge)

        result["topology"] = topology
        yield json.dumps({"step": 5, "type": "analysis_complete", "result": result})


sre_simulator = SRESimulator()
