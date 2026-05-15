from fastapi import APIRouter, HTTPException, Body
from services.detector import download_image, EMBEDDING_MODEL, validate_url
from deepface import DeepFace
import os
import asyncio

router = APIRouter()

@router.post("/embed")
async def get_embedding(selfie_url: str = Body(..., embed=True)):
    """
    Generates a face embedding for a selfie URL.
    Returns a list of 512 floats (ArcFace).

    Uses enforce_detection=True so DeepFace raises a ValueError when no real
    face is found — no fallback embeddings, no false positives.
    """
    tmp_path = None
    try:
        if not validate_url(selfie_url):
            raise HTTPException(status_code=400, detail="Invalid image URL")

        tmp_path = await asyncio.to_thread(download_image, selfie_url)
        print(f"[EMBED] Image downloaded to: {tmp_path}")

        # For selfie validation we use ONLY retinaface — it has the lowest
        # false-positive rate. yunet, opencv and ssd often find "faces" in 
        # clouds or textures. enforce_detection=True ensures we reject 
        # images without clear faces.
        try:
            print(f"[EMBED] Trying detector: retinaface")
            results = await asyncio.to_thread(
                DeepFace.represent,
                img_path=tmp_path,
                model_name=EMBEDDING_MODEL,
                detector_backend="retinaface",
                enforce_detection=True,
            )
            print(f"[EMBED] retinaface found {len(results)} face(s)")
        except ValueError:
            print(f"[EMBED] retinaface: no face detected — rejecting image")
            raise HTTPException(
                status_code=400,
                detail="No face detected. Please upload a clear photo of your face."
            )
        except Exception as e:
            print(f"[EMBED] retinaface error: {str(e)}")
            raise HTTPException(status_code=500, detail="Face processing failed. Please try again.")

        if not results:
            print(f"[EMBED] All detectors found no face — rejecting image")
            raise HTTPException(
                status_code=400,
                detail="No face detected. Please upload a clear photo of your face."
            )

        if len(results) > 1:
            print(f"[EMBED] Multiple faces detected ({len(results)}) — rejecting image")
            raise HTTPException(
                status_code=400,
                detail="Multiple faces detected. Please upload a photo with only your face."
            )

        embedding = results[0].get("embedding", [])
        if not embedding:
            raise HTTPException(
                status_code=400,
                detail="Could not extract face features. Please upload a clearer photo."
            )

        facial_area = results[0].get("facial_area", {})
        confidence = results[0].get("face_confidence", 0.0)
        print(f"[EMBED] Face accepted — confidence: {confidence:.3f}, bbox: {facial_area}, embedding_len: {len(embedding)}")

        return {"embedding": embedding}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[EMBED] Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Face processing failed. Please try again with a clearer photo.")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
