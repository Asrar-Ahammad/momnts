# from fastapi import FastAPI
# from routes import detect, match, embed
# from dotenv import load_dotenv

# load_dotenv()

# app = FastAPI(
#     title="momnts-vision",
#     description="Face detection and matching microservice for Momnts",
#     version="1.0.0",
# )

# # Register route handlers
# app.include_router(detect.router)
# app.include_router(match.router)
# app.include_router(embed.router)

# @app.get("/health")
# def health():
#     return {
#         "status": "ok",
#         "service": "momnts-vision",
#     }

import modal
import os
from dotenv import load_dotenv

load_dotenv()

app = modal.App("momnts-vision")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install([
        "libglib2.0-0",
        "libsm6",
        "libxext6",
        "libxrender-dev",
        "libgomp1",
        "libgl1-mesa-glx",
    ])
    .pip_install([
        "deepface==0.0.93",
        "tf-keras",
        "fastapi",
        "uvicorn",
        "requests",
        "numpy",
        "pillow",
        "opencv-python-headless",
        "python-dotenv",
    ])
    .run_commands(
        "python -c \""
        "from deepface import DeepFace; "
        "import numpy as np; "
        "img = np.zeros((224,224,3), dtype='uint8'); "
        "DeepFace.represent(img, model_name='ArcFace', "
        "detector_backend='opencv', enforce_detection=False); "
        "print('ArcFace model cached')\""
    )
    .add_local_dir(
        ".",
        remote_path="/root",
        ignore=modal.FilePatternMatcher.from_file(".modalignore"),
    )
)

@app.function(
    image=image,
    scaledown_window=300,
    memory=2048,
    timeout=120,
)
@modal.asgi_app()
def fastapi_app():
    import sys
    sys.path.insert(0, "/root")

    from fastapi import FastAPI
    from routes import detect, match, embed

    web_app = FastAPI(
        title="momnts-vision",
        description="Face detection and matching microservice for Momnts",
        version="1.0.0",
    )

    web_app.include_router(detect.router)
    web_app.include_router(match.router)
    web_app.include_router(embed.router)

    @web_app.get("/health")
    def health():
        return {
            "status": "ok",
            "service": "momnts-vision",
        }

    return web_app


@app.local_entrypoint()
def main():
    pass