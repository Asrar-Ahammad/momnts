import logging
import numpy as np
from typing import List, Optional
from models.schemas import MatchResult

# Minimum similarity score to consider two faces the same person
# 0.6 means 60% similar — tune this based on false positive testing
SIMILARITY_THRESHOLD = 0.6

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculates cosine similarity between two face embedding vectors.
    Returns a value between -1 and 1:
      1.0  = identical faces
      0.0  = completely different
      -1.0 = opposite (never happens with face embeddings)

    Cosine similarity measures the angle between two vectors.
    The same person's face always produces vectors pointing
    in a similar direction regardless of lighting or angle.
    """
    a = np.array(vec1)
    b = np.array(vec2)

    # Dot product divided by product of magnitudes
    dot_product = np.dot(a, b)
    magnitude = np.linalg.norm(a) * np.linalg.norm(b)

    if magnitude == 0:
        return 0.0

    return float(dot_product / magnitude)

def find_best_match(
    query_embedding: List[float],
    candidates: List[dict],  # list of { face_profile_id, embedding_vector }
) -> Optional[MatchResult]:
    """
    Finds the best matching face profile for a given embedding.
    Compares query_embedding against all candidate profiles
    and returns the closest match above the threshold.

    candidates come from the Node.js API — it fetches all
    FACE_PROFILE embeddings for the event and passes them here.
    """
    best_match = None
    best_similarity = -1.0
    query_len = len(query_embedding)

    for candidate in candidates:
        # Validate candidate has embedding_vector
        embedding_vector = candidate.get("embedding_vector")
        if embedding_vector is None:
            logging.warning(f"Skipping candidate without embedding_vector: {candidate.get('face_profile_id', 'unknown')}")
            continue

        # Validate embedding_vector is a sequence with matching dimensionality
        if not isinstance(embedding_vector, (list, tuple, np.ndarray)):
            logging.warning(f"Skipping candidate with invalid embedding type: {candidate.get('face_profile_id', 'unknown')}")
            continue

        if len(embedding_vector) != query_len:
            logging.warning(f"Skipping candidate with mismatched embedding dimensions: {candidate.get('face_profile_id', 'unknown')}")
            continue

        similarity = cosine_similarity(
            query_embedding,
            embedding_vector
        )

        # Keep track of the highest similarity we've seen
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = candidate

    # Only return a match if similarity is above our threshold
    if best_match and best_similarity >= SIMILARITY_THRESHOLD:
        return MatchResult(
            face_profile_id=best_match["face_profile_id"],
            similarity=best_similarity,
        )

    return None  # no match found