import os
import numpy as np
from deepface import DeepFace

def prewarm():
    print("[PREWARM] Starting pre-warming of DeepFace models...")
    
    # Create a simple 100x100 dummy image (RGB black canvas)
    dummy_image = np.zeros((100, 100, 3), dtype=np.uint8)
    
    # We use ArcFace for embeddings and retinaface for detection backend
    embedding_model = "ArcFace"
    detector_backend = "retinaface"
    
    print(f"[PREWARM] Initializing and downloading model: {embedding_model} with detector: {detector_backend}...")
    try:
        # Running represent on dummy image with enforce_detection=False so it downloads
        # the weights files without failing due to the absence of a face in the black canvas.
        DeepFace.represent(
            img_path=dummy_image,
            model_name=embedding_model,
            detector_backend=detector_backend,
            enforce_detection=False
        )
        print("[PREWARM] Successfully pre-warmed ArcFace and RetinaFace models!")
    except Exception as e:
        print(f"[PREWARM] Failed during pre-warming representation: {e}")
        # Re-raise to fail build if model download didn't work
        raise e

if __name__ == "__main__":
    prewarm()
