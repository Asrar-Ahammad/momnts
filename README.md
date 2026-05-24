# Momnts

Momnts is a full-stack, intelligent photo-sharing application designed for events. It allows event organizers to create events and attendees to upload photos. A sophisticated AI backend processes these photos to detect and group faces, enabling users to easily find pictures of themselves and others across an entire event gallery.

The project is built with a modern microservices architecture, comprising a responsive web frontend, a main backend API, and a specialized computer vision service, all communicating asynchronously via background jobs and real-time WebSocket events.

## Architecture

The application is divided into three main components:

1.  **`momnts-web` (Frontend):** A responsive and modern user interface built with React, Vite, and TypeScript. It handles all user interactions, including authentication, event creation, photo uploads, and viewing event galleries. It listens for real-time updates from the backend to update the UI dynamically.

2.  **`momnts-api` (Backend API):** The core backend service built with the Bun runtime, Express, and TypeScript. It manages user data, authentication, event logic, and photo metadata. It uses Prisma as its ORM for a PostgreSQL database and leverages BullMQ with Redis to manage background jobs for all heavy processing. It communicates with the frontend via a REST API and Socket.IO for real-time events.

3.  **`momnts-vision` (Vision Service):** A specialized Python microservice built with FastAPI. This service exposes endpoints for AI-powered computer vision tasks, primarily face detection and embedding generation. It uses the `deepface` library with a `retina-face` backend for high-accuracy face detection.

## Technology Stack

### `momnts-web` (Frontend)

-   **Framework:** React 19 with Vite
-   **Language:** TypeScript
-   **UI Components:** Shadcn UI, Phospher Icons
-   **Routing:** React Router
-   **State Management/Data Fetching:** TanStack Query
-   **Styling:** Tailwind CSS
-   **Forms:** TanStack Form
-   **Real-time Communication:** Socket.IO Client

### `momnts-api` (Backend)

-   **Runtime:** Bun
-   **Framework:** Express.js
-   **Language:** TypeScript
-   **Database:** PostgreSQL with the `pgvector` extension (for embeddings)
-   **ORM:** Prisma
-   **Authentication:** JSON Web Tokens (JWT) with refresh tokens
-   **Background Jobs:** BullMQ with Redis
-   **File Storage:** Cloudflare R2 (inferred from `@aws-sdk/client-s3`)
-   **Real-time Communication:** Socket.IO with Redis Pub/Sub

### `momnts-vision` (AI/ML)

-   **Framework:** FastAPI
-   **Language:** Python
-   **Core Libraries:**
    -   `deepface`: For core face recognition and analysis.
    -   `retina-face`: For high-accuracy face detection.
    -  `arcface` :For face embedding generation.

## Features

-   **User Authentication:** Secure user registration and login with JWT.
-   **Onboarding with Selfie:** Users provide a selfie during onboarding, which is used to create a reference face embedding.
-   **Event Management:** Organizers can create, manage, and share events with unique invite codes.
-   **Photo Uploads:** Attendees can upload photos to events, which are then processed in the background.
-   **Automated Face Detection:** The `momnts-vision` service automatically detects all faces in every uploaded photo.
-   **Face Deduplication & Grouping:** The backend generates a unique `FaceProfile` for each individual person detected in an event. It uses vector similarity searches to avoid creating duplicate profiles for the same person, effectively grouping all their photos.
-   **Personalized Galleries:** Once a user provides a selfie, the system automatically compares it against all face profiles in an event and "claims" the matching profile, instantly giving the user access to all photos they appear in.
-   **Real-time Notifications:** The UI updates in real-time to show photo processing status and new face match notifications via WebSockets.
-   **Efficient Background Processing:** All heavy tasks (photo processing, face detection, and matching) are handled by BullMQ background workers to ensure the API remains fast and responsive.

## Core Workflow: Photo Processing & Matching

The end-to-end process for analyzing a photo and matching it to a user is a key part of the system's architecture:

1.  **Upload:** A user uploads a photo to an event via the `momnts-web` frontend.
2.  **API Receives:** The `momnts-api` receives the file, uploads it to S3, creates a `Photo` record in the database, and enqueues a job in the `photo-processing` queue in Redis.
3.  **Photo Worker:** The `photo.worker.ts` process picks up the job from the queue.
4.  **Face Detection:** The worker calls the `/detect` endpoint on the `momnts-vision` service, providing the image URL.
5.  **Vision Service Processes:** `momnts-vision` downloads the image, runs face detection using `deepface`, and returns an array of faces, each with its bounding box and a 512-dimension embedding vector.
6.  **Face Deduplication:** For each detected face, the photo worker performs a vector similarity search (`<=>` operator in `pgvector`) against all existing `FaceProfile`s in the event.
    -   **If a similar face is found**, the worker links the newly detected face to the existing `FaceProfile`.
    -   **If no similar face exists**, it creates a new `FaceProfile` for this new person.
7.  **Processing Complete:** The worker marks the photo as `processed` and publishes a `photo-processed` event to a Redis channel. The Socket.IO server broadcasts this to all clients in the event, updating the UI in real-time.
8.  **Trigger Matching:** The photo worker enqueues jobs in the `face-matching` queue for every user in the event who has completed selfie onboarding.
9.  **Match Worker:** The `match.worker.ts` process picks up the matching job. It compares the user's selfie embedding against all *unclaimed* `FaceProfile` embeddings in the event using `pgvector`.
10. **Claim Profile:** If a profile's similarity is above a certain threshold, the worker "claims" it for that user by updating the `claimed_by` field in the database.
11. **Notify User:** The worker publishes a `face-matched` event to a user-specific channel. Socket.IO sends a notification to the user's client, informing them new photos of them have been found.

## Getting Started

To run the project locally, you will need to set up each service in a separate terminal.

### Prerequisites

-   Node.js and Bun
-   Python 3.10+ and `pip`
-   PostgreSQL with the `pgvector` extension
-   Redis
-   Access to an Cloudflare R2 bucket (or compatible service)

### 1. `momnts-api`

The API service requires three processes: the main web server and two background workers.

```bash
cd momnts-api
cp .env.example .env # Add your database, Redis, and S3 credentials
bun install

# In terminal 1: Start the web server
bun run dev

# In terminal 2: Start the photo processing worker
bun run worker:photos

# In terminal 3: Start the face matching worker
bun run worker:matching

# Alternatively, to run all three concurrently (requires `concurrently` installed):
bun run server
```

### 2. `momnts-vision`

```bash
cd momnts-vision
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env # Configure any necessary environment variables
uvicorn main:app --reload
```

### 3. `momnts-web`

```bash
cd momnts-web
cp .env.example .env # Add the URL for the momnts-api service
bun install
bun run dev
```
