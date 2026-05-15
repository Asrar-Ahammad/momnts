from pydantic import BaseModel
from typing import List, Optional

# Bounding box for a detected face
class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int


# Represents one detected face
class DetectedFace(BaseModel):
    bbox: BoundingBox
    embedding: List[float]  # ArcFace → 512 dimensions
    confidence: float


# Response from /detect
class DetectResponse(BaseModel):
    photo_id: str
    faces: List[DetectedFace]
    total_faces: int


# Candidate passed from Node API
class Candidate(BaseModel):
    face_profile_id: str
    embedding_vector: List[float]


# Match result
class MatchResult(BaseModel):
    face_profile_id: str
    similarity: float


# Response from /match
class MatchResponse(BaseModel):
    matched: bool
    match: Optional[MatchResult]