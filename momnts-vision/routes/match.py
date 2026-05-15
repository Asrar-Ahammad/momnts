import logging
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import List
from services.detector import embed_selfie
from services.matcher import find_best_match
from models.schemas import MatchResponse, MatchResult

router = APIRouter()

class Candidate(BaseModel):
    face_profile_id: str
    embedding_vector: List[float]

class MatchRequest(BaseModel):
    selfie_url: str           # R2 URL of the attendee's selfie
    candidates: List[Candidate]  # all face profiles for this event,
                                 # fetched by Node.js and passed here

@router.post("/match", response_model=MatchResponse)
async def match(req: MatchRequest):
    """
    Embeds the selfie and finds the closest matching face profile
    from the candidates list. Called by POST /events/:eventId/match
    in momnts-api.
    """
    try:
        # Generate embedding for the selfie
        selfie_embedding = await run_in_threadpool(embed_selfie, req.selfie_url)

        # Find the best match among event's face profiles
        result = await run_in_threadpool(
            find_best_match,
            selfie_embedding,
            [c.dict() for c in req.candidates]
        )

        return MatchResponse(
            matched=result is not None,
            match=result,
        )
    except ValueError as e:
        # ValueError means no face detected in selfie
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logging.exception("Error in match endpoint")
        raise HTTPException(status_code=500, detail="Internal server error")