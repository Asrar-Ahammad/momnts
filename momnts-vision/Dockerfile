# Use the official Python slim image for a compact size
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /app

# Install system dependencies needed by OpenCV and image processing libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy python dependencies list
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and prewarm script
COPY . .

# Run prewarm script during build phase to download ArcFace and RetinaFace model weights
# This bakes the neural network weights into the Docker image, preventing cold start issues
# and outbound download failures in secure AWS VPC private subnets.
RUN python prewarm.py

# Expose microservice port
EXPOSE 8000

# Run uvicorn server in production mode
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
