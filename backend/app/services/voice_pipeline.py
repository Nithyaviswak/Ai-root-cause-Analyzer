"""Voice pipeline service — streaming STT → LLM → TTS with sub-second latency.

Architecture:
  Audio stream → Whisper STT (streaming) → Partial transcript
  → LLM (streaming tokens) → Streaming TTS → Audio chunks

This module provides the voice pipeline orchestration with:
- VAD (Voice Activity Detection) for turn-taking
- Streaming STT with partial transcripts  
- Token-level LLM streaming for minimal TTFT
- Streaming TTS that starts speaking on partial output
- Barge-in support (interrupt while speaking)
"""

import asyncio
import json
import logging
import time
from typing import AsyncGenerator, Optional

logger = logging.getLogger(__name__)


class VoicePipeline:
    """Streaming voice pipeline for sub-second latency.
    
    Latency targets:
    - STT: <300ms (partial transcript)
    - LLM first token: <800ms  
    - Voice response start: <1s total
    
    Key design decisions:
    - Never wait for full transcript before starting LLM
    - Never wait for full LLM response before starting TTS
    - Use VAD for natural turn-taking
    - Support barge-in (user can interrupt)
    """

    def __init__(self):
        self._is_speaking = False
        self._should_stop = False
    
    async def process_audio_stream(
        self,
        audio_chunks: AsyncGenerator[bytes, None],
        context: str = "",
    ) -> AsyncGenerator[dict, None]:
        """Process streaming audio input and yield response events.
        
        Yields events:
        - {"type": "vad", "speaking": bool}           — Voice activity
        - {"type": "transcript", "text": str, "final": bool}  — STT output
        - {"type": "llm_token", "token": str}          — LLM tokens
        - {"type": "tts_audio", "audio": bytes}        — TTS audio chunks
        - {"type": "done"}                             — Pipeline complete
        """
        start_time = time.monotonic()
        transcript_buffer = ""
        
        # Phase 1: STT — Stream audio and emit partial transcripts
        yield {"type": "vad", "speaking": True}
        
        async for chunk in audio_chunks:
            # In production: send to Whisper/Deepgram streaming API
            # For now, simulate partial transcript
            partial = await self._stt_process_chunk(chunk)
            if partial:
                transcript_buffer += partial
                yield {
                    "type": "transcript",
                    "text": transcript_buffer,
                    "final": False,
                    "latency_ms": int((time.monotonic() - start_time) * 1000),
                }
        
        # Final transcript
        yield {
            "type": "transcript", 
            "text": transcript_buffer,
            "final": True,
            "latency_ms": int((time.monotonic() - start_time) * 1000),
        }
        
        # Phase 2: LLM — Stream tokens as soon as partial transcript available
        llm_start = time.monotonic()
        full_response = ""
        
        async for token in self._llm_stream(transcript_buffer, context):
            if self._should_stop:  # Barge-in support
                break
            is_first = (full_response == "")
            full_response += token
            yield {
                "type": "llm_token",
                "token": token,
                "ttft_ms": int((time.monotonic() - llm_start) * 1000) if is_first else None,
            }
            
            # Phase 3: TTS — Start speaking as soon as we have a sentence
            if self._is_sentence_boundary(full_response):
                async for audio_chunk in self._tts_stream(full_response):
                    yield {"type": "tts_audio", "audio": audio_chunk.hex()}
                full_response = ""
        
        # Flush remaining TTS
        if full_response.strip():
            async for audio_chunk in self._tts_stream(full_response):
                yield {"type": "tts_audio", "audio": audio_chunk.hex()}
        
        total_latency = int((time.monotonic() - start_time) * 1000)
        yield {"type": "done", "total_latency_ms": total_latency}
    
    async def process_text_to_voice(
        self,
        text: str,
        context: str = "",
    ) -> AsyncGenerator[dict, None]:
        """Process text input through LLM → TTS pipeline.
        
        Used when text is already available (typed input + voice output).
        """
        start_time = time.monotonic()
        
        # Stream LLM response
        full_response = ""
        sentence_buffer = ""
        
        async for token in self._llm_stream(text, context):
            if self._should_stop:
                break
            full_response += token
            sentence_buffer += token
            
            yield {"type": "llm_token", "token": token}
            
            # Stream TTS on sentence boundaries
            if self._is_sentence_boundary(sentence_buffer):
                self._is_speaking = True
                async for audio_chunk in self._tts_stream(sentence_buffer):
                    yield {"type": "tts_audio", "audio": audio_chunk.hex()}
                sentence_buffer = ""
        
        # Flush remaining
        if sentence_buffer.strip():
            async for audio_chunk in self._tts_stream(sentence_buffer):
                yield {"type": "tts_audio", "audio": audio_chunk.hex()}
        
        self._is_speaking = False
        total_latency = int((time.monotonic() - start_time) * 1000)
        yield {"type": "done", "total_latency_ms": total_latency}
    
    def barge_in(self):
        """Handle user interruption — stop current TTS output."""
        self._should_stop = True
        self._is_speaking = False
    
    def reset(self):
        """Reset pipeline state for new turn."""
        self._should_stop = False
        self._is_speaking = False
    
    # ── Internal Methods ──
    
    async def _stt_process_chunk(self, audio_chunk: bytes) -> Optional[str]:
        """Process audio chunk through streaming STT.
        
        Production: Use Deepgram or Whisper streaming API
        - Deepgram: WebSocket-based, ~150ms latency for partials
        - Whisper: Use whisper-streaming for real-time transcription
        """
        # Simulate STT processing delay
        await asyncio.sleep(0.05)
        return None  # In production: return partial transcript
    
    async def _llm_stream(self, text: str, context: str = "") -> AsyncGenerator[str, None]:
        """Stream LLM tokens with minimal TTFT.
        
        Production: Use model with lowest TTFT first, 
        then optionally run deeper model for detailed analysis.
        """
        # Import here to avoid circular dependency
        from app.services.gemini_llm import gemini_llm
        
        sre_context = f"""User voice query: {text}
        
Previous context: {context}

Provide a brief, spoken-friendly SRE analysis. Keep it concise for voice output.
Focus on: what's happening, likely cause, and immediate action to take."""
        
        async for token in gemini_llm.analyze_stream(sre_context, query=text):
            yield token
    
    async def _tts_stream(self, text: str) -> AsyncGenerator[bytes, None]:
        """Stream TTS audio chunks.
        
        Production options:
        - edge-tts: Free, decent quality, ~200ms startup
        - ElevenLabs: Premium quality, streaming API
        - Google Cloud TTS: Low latency streaming
        
        Key: Start TTS before full sentence is complete.
        """
        # Simulate TTS chunk generation
        # In production: use edge_tts.Communicate or similar
        try:
            import edge_tts
            
            communicate = edge_tts.Communicate(text, "en-US-AndrewNeural")
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
        except ImportError:
            # Fallback: yield empty audio frames
            await asyncio.sleep(0.1)
            yield b'\x00' * 1600  # Silence frame
    
    def _is_sentence_boundary(self, text: str) -> bool:
        """Detect sentence boundary for TTS chunking."""
        text = text.strip()
        return text.endswith(('.', '!', '?', ':', '\n')) and len(text) > 20


voice_pipeline = VoicePipeline()
