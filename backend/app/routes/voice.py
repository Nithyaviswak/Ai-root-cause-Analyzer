"""Voice WebSocket route — streaming voice pipeline endpoint.

Provides WebSocket endpoint for real-time voice interaction:
- Receives audio chunks from client
- Streams back transcript, LLM tokens, and TTS audio
- Supports barge-in (interruption)
- Uses WebRTC-compatible transport
"""

import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.voice_pipeline import VoicePipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["voice"])


@router.websocket("/voice/stream")
async def voice_stream(websocket: WebSocket):
    """WebSocket endpoint for streaming voice interaction.
    
    Client sends:
    - {"type": "audio", "data": "<base64_audio>"}  — Audio chunk
    - {"type": "text", "text": "query"}              — Text query (for text→voice)
    - {"type": "barge_in"}                           — Interrupt current response
    - {"type": "end"}                                — End of input
    
    Server sends:
    - {"type": "vad", "speaking": bool}
    - {"type": "transcript", "text": str, "final": bool}
    - {"type": "llm_token", "token": str}
    - {"type": "tts_audio", "audio": "<hex_audio>"}
    - {"type": "done", "total_latency_ms": int}
    """
    await websocket.accept()
    pipeline = VoicePipeline()  # Per-session instance
    logger.info("Voice WebSocket connected")
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")
            
            if msg_type == "barge_in":
                pipeline.barge_in()
                await websocket.send_json({"type": "barge_in_ack"})
                continue
            
            if msg_type == "text":
                # Text → Voice pipeline
                pipeline.reset()
                text = message.get("text", "")
                context = message.get("context", "")
                
                async for event in pipeline.process_text_to_voice(text, context):
                    try:
                        await websocket.send_json(event)
                    except Exception:
                        break
                continue
            
            if msg_type == "end":
                await websocket.send_json({"type": "session_end"})
                break
                
    except WebSocketDisconnect:
        logger.info("Voice WebSocket disconnected")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        pipeline.reset()
