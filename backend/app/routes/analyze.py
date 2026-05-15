"""Analysis API routes."""

import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from app.models.schemas import AnalysisRequest, AnalysisResponse, ChatRequest
from app.models.database import db
from app.services.sre_simulator import sre_simulator
from app.services.report_service import report_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_logs(request: AnalysisRequest):
    """Run root cause analysis on provided logs/metrics/traces."""
    if not request.logs.strip():
        raise HTTPException(status_code=400, detail="No log data provided")

    try:
        result = await sre_simulator.run_analysis(
            logs=request.logs,
            metrics=request.metrics,
            traces=request.traces,
            context=request.context,
        )

        # Save to history
        await db.save_analysis(
            input_text=request.logs[:500],
            result=result,
        )

        return AnalysisResponse(**result)

    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/analyze/stream")
async def analyze_logs_stream(request: AnalysisRequest):
    """Stream root cause analysis with step-by-step progress updates."""
    if not request.logs.strip():
        raise HTTPException(status_code=400, detail="No log data provided")

    async def event_stream():
        try:
            async for chunk in sre_simulator.run_analysis_stream(
                logs=request.logs,
                metrics=request.metrics,
                traces=request.traces,
                context=request.context,
            ):
                # Ensure the chunk is clean and format as valid SSE
                # json.dumps already handles escaping newlines
                yield f"data: {chunk}\n\n"

                # If analysis is complete, save to history
                try:
                    data = json.loads(chunk)
                    if data.get("type") == "analysis_complete" and "result" in data:
                        await db.save_analysis(
                            input_text=request.logs[:500],
                            result=data["result"],
                        )
                except json.JSONDecodeError:
                    pass

        except Exception as e:
            logger.error(f"Stream analysis failed: {e}", exc_info=True)
            # Yield error as an SSE chunk before closing
            error_data = json.dumps({"type": "error", "message": f"Analysis interrupted: {str(e)}"})
            yield f"data: {error_data}\n\n"
        
        finally:
            # Always send the termination signal
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat")
async def chat_analyze(request: ChatRequest):
    """Chat-style analysis endpoint."""
    # Extract logs from the user message
    result = await sre_simulator.run_analysis(
        logs=request.message,
        context="\n".join(f"{m.role}: {m.content}" for m in request.history[-5:]) if request.history else None,
    )

    await db.save_analysis(input_text=request.message[:500], result=result)
    return result


@router.post("/analyze/report")
async def generate_report(analysis_result: dict):
    """Generate and download a PDF report."""
    try:
        report_path = report_service.generate_postmortem(analysis_result)
        return FileResponse(
            report_path, 
            media_type="application/pdf", 
            filename=f"postmortem_{analysis_result.get('id', 'incident')}.pdf"
        )
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
