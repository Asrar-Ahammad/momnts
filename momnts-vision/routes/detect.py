from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from services.detector import detect_faces
from models.schemas import DetectResponse

router = APIRouter()

class DetectRequest(BaseModel):
    photo_id: str   # passed by the Node.js worker
    image_url: str  # R2 display URL to download and process

@router.post("/detect", response_model=DetectResponse)
async def detect(req: DetectRequest):
    """
    Accepts an image URL, detects all faces, returns bounding boxes
    and embedding vectors. Called by the BullMQ worker in momnts-api.
    """
    print(f"[DETECT] Processing photo: {req.photo_id}")
    print(f"[DETECT] Image URL: {req.image_url}")
    try:
        faces = await run_in_threadpool(detect_faces, req.image_url)
        print(f"[DETECT] Found {len(faces)} faces for photo {req.photo_id}")

        return DetectResponse(
            photo_id=req.photo_id,
            faces=faces,
            total_faces=len(faces),
        )
    except ValueError as e:
        print(f"[DETECT] ValueError for photo {req.photo_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[DETECT] Exception for photo {req.photo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")