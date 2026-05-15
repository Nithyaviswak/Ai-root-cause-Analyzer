"""Google Gemini LLM integration with streaming support."""

import json
import logging
from typing import AsyncGenerator
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)

# ── System Prompt ──────────────────────────────────────────────

SRE_SYSTEM_PROMPT = """You are an expert Site Reliability Engineer (SRE) AI assistant specialized in root cause analysis.

Your role:
1. Analyze application logs, system metrics, and trace data
2. Identify the true root cause of incidents (not just symptoms)
3. Distinguish between correlation and causation
4. Provide structured, actionable analysis

YOU MUST respond in the following JSON format:
{
  "detected_issue": "Clear, concise summary of the detected issue",
  "severity": "low | medium | high | critical",
  "affected_services": ["list", "of", "affected", "services"],
  "root_cause": "Detailed root cause analysis with reasoning",
  "evidence": [
    "Specific log snippet or metric that supports this finding"
  ],
  "confidence_score": "0-100%",
  "suggested_fix": "Step-by-step recommended fix",
  "improved_code": "Clean, optimized code block containing the fix (leave empty string if no code is involved)",
  "preventive_measures": "Long-term measures to prevent recurrence",
  "topology_hints": {
    "nodes": [{"id": "svc-1", "label": "Service Name", "status": "healthy|warning|critical"}],
    "edges": [{"source": "svc-1", "target": "svc-2", "label": "calls"}]
  }
}

Guidelines:
- ALWAYS respond with valid JSON matching this schema
- Base severity on business impact (critical = data loss/complete outage)
- Include specific log lines and metrics as evidence
- Confidence score should reflect certainty (>80% = strong evidence, <50% = speculative)
- Suggested fixes should be actionable and specific
- Preventive measures should address systemic issues, not just symptoms"""


class GeminiLLM:
    """Google Gemini API wrapper with streaming support.
    
    Uses the google-generativeai SDK for:
    - Root cause explanation generation
    - Incident summarization
    - Fix suggestions
    - Streaming responses
    """

    def __init__(self):
        self._model = None
        self._configured = False

    def configure(self):
        """Configure the Gemini API."""
        if not settings.GOOGLE_API_KEY:
            logger.warning("GOOGLE_API_KEY not set — Gemini LLM will use mock responses")
            return

        genai.configure(api_key=settings.GOOGLE_API_KEY)
        self._model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=SRE_SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                top_p=0.8,
                max_output_tokens=4096,
            ),
        )
        self._configured = True
        logger.info(f"Gemini LLM configured with model: {settings.GEMINI_MODEL}")

    async def analyze(self, context: str, query: str = "") -> dict:
        """Run root cause analysis and return structured result."""
        if not self._configured:
            return self._mock_response(context)

        prompt = self._build_prompt(context, query)

        try:
            response = await self._model.generate_content_async(prompt)
            return self._parse_response(response.text)
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return self._mock_response(context, error=str(e))

    async def analyze_stream(self, context: str, query: str = "") -> AsyncGenerator[str, None]:
        """Stream root cause analysis results as raw text chunks."""
        if not self._configured:
            # Mock streaming response in chunks
            mock = self._mock_response(context)
            mock_text = mock.get("root_cause", "Analysis complete.")
            # Stream the root_cause part to simulate AI thinking
            for word in mock_text.split(" "):
                yield word + " "
                import asyncio
                await asyncio.sleep(0.05)
            return

        prompt = self._build_prompt(context, query)

        try:
            # Use async streaming to avoid blocking the event loop
            response = await self._model.generate_content_async(prompt, stream=True)
            async for chunk in response:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error(f"Gemini streaming error: {e}")
            yield f"ERROR: {str(e)}"

    async def summarize_incident(self, analysis_result: dict) -> str:
        """Generate a human-readable incident summary."""
        if not self._configured:
            return f"Incident: {analysis_result.get('detected_issue', 'Unknown')} — {analysis_result.get('root_cause', 'Unknown cause')}"

        prompt = f"""Summarize this incident analysis in 2-3 sentences for a status page update:

{json.dumps(analysis_result, indent=2)}

Be concise and focus on: what happened, what was affected, and current status."""

        try:
            response = await self._model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Summarization error: {e}")
            return f"Incident: {analysis_result.get('detected_issue', 'Unknown issue')}"

    def _build_prompt(self, context: str, query: str = "") -> str:
        """Build the analysis prompt with context injection."""
        parts = [
            "Analyze the following system data and provide a root cause analysis.\n",
            "=== SYSTEM DATA ===",
            context,
        ]

        if query:
            parts.append(f"\n=== USER QUESTION ===\n{query}")

        parts.append(
            "\n\nProvide your analysis in the required JSON format. "
            "Be thorough, identify the TRUE root cause, and give specific evidence."
        )

        return "\n".join(parts)

    def _parse_response(self, text: str) -> dict:
        """Parse Gemini response into structured format."""
        # Try to extract JSON from response
        try:
            # Handle markdown code blocks
            if "```json" in text:
                json_str = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                json_str = text.split("```")[1].split("```")[0].strip()
            else:
                json_str = text.strip()

            return json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            logger.warning("Failed to parse Gemini response as JSON, wrapping raw text")
            return {
                "detected_issue": "Analysis completed",
                "severity": "medium",
                "affected_services": [],
                "root_cause": text,
                "evidence": [],
                "confidence_score": "50%",
                "suggested_fix": "Review the analysis above for details.",
                "improved_code": "",
                "preventive_measures": "Implement monitoring and alerting.",
            }

    def _mock_response(self, context: str, error: str = "") -> dict:
        """Generate a mock response when API key is not configured."""
        # Extract basic info from context
        has_error = "error" in context.lower()
        has_timeout = "timeout" in context.lower()

        issue = "Multiple errors detected in system logs"
        if has_timeout:
            issue = "Service timeout errors detected"
        if "connection" in context.lower():
            issue = "Connection failure between services"

        return {
            "detected_issue": issue,
            "severity": "high" if has_error else "medium",
            "affected_services": ["detected-from-logs"],
            "root_cause": f"[DEMO MODE - Set GOOGLE_API_KEY for real analysis] Analysis based on log patterns shows potential issues. {error}",
            "evidence": ["Log patterns indicate errors", "Context analysis performed locally"],
            "confidence_score": "30%",
            "suggested_fix": "Configure GOOGLE_API_KEY in .env for AI-powered root cause analysis.",
            "improved_code": "const api_key = process.env.GOOGLE_API_KEY;\nif (!api_key) {\n  throw new Error('API key missing');\n}",
            "preventive_measures": "Enable full AI analysis for comprehensive monitoring.",
        }

    @property
    def is_configured(self) -> bool:
        return self._configured


gemini_llm = GeminiLLM()
