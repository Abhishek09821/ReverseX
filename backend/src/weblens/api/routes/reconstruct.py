"""Reconstruction endpoints.

Replaces the old website-audit scan flow with a single-prompt reconstruction pipeline.
Accepts website URLs or GitHub repository URLs/identifiers and returns one
GitReverse-style reconstruction prompt.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import StreamingResponse

from weblens.domain.errors import ScanNotFoundError
from weblens.domain.reconstruction import (
    ReconstructionAcceptedResponse,
    ReconstructionJobState,
    ReconstructionRequest,
    ReconstructionResult,
)
from weblens.logging import get_logger
from weblens.reconstruction.service import ReconstructionService
from weblens.utils.ids import is_ulid

logger = get_logger(__name__)

router = APIRouter(prefix="/reconstruct", tags=["reconstruct"])


def _get_service(request: Request) -> ReconstructionService:
    service = getattr(request.app.state, "reconstruction_service", None)
    if service is None:
        raise RuntimeError("reconstruction_service not attached to app.state")
    if not isinstance(service, ReconstructionService):
        raise RuntimeError(f"reconstruction_service is wrong type: {type(service)}")
    return service


ReconstructionServiceDep = Depends(_get_service)


@router.post(
    "",
    response_model=ReconstructionAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a website URL or GitHub repo for reconstruction prompt generation",
)
async def create_reconstruction(
    request: ReconstructionRequest,
    req: Request,
) -> ReconstructionAcceptedResponse:
    """Accept a URL (website or GitHub repo) and start analysis."""
    return await _get_service(req).submit(request)


@router.get(
    "/{scan_id}",
    response_model=ReconstructionJobState,
    summary="Current status and stage progress of a reconstruction job",
)
async def get_reconstruction_state(scan_id: str, req: Request) -> ReconstructionJobState:
    _validate_id(scan_id)
    return await _get_service(req).job_state(scan_id)


@router.get(
    "/{scan_id}/result",
    response_model=ReconstructionResult,
    summary="The finished reconstruction prompt",
    responses={
        409: {"description": "Analysis is still in progress."},
        404: {"description": "No such analysis job."},
    },
)
async def get_reconstruction_result(scan_id: str, req: Request) -> ReconstructionResult:
    _validate_id(scan_id)
    return await _get_service(req).result(scan_id)


@router.delete(
    "/{scan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Release the server-side copy once the client has saved it",
)
async def delete_reconstruction(scan_id: str, req: Request) -> Response:
    _validate_id(scan_id)
    await _get_service(req).delete(scan_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{scan_id}/events",
    summary="Server-sent events for reconstruction progress",
    response_class=StreamingResponse,
)
async def reconstruction_events(scan_id: str, req: Request) -> StreamingResponse:
    _validate_id(scan_id)
    channel = await _get_service(req).channel(scan_id)

    async def event_stream() -> AsyncIterator[bytes]:
        async for event in channel.subscribe():
            if event.event == "heartbeat":
                yield b": ping\n\n"
                continue
            payload = json.dumps(event.data, default=str)
            yield f"event: {event.event}\ndata: {payload}\n\n".encode()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _validate_id(scan_id: str) -> None:
    if not is_ulid(scan_id):
        raise ScanNotFoundError(f"'{scan_id}' is not a valid analysis id.")
