# Momnts

Momnts is a full-stack, intelligent photo-sharing application designed for events. It allows event organizers to create events and attendees to upload photos. A sophisticated AI backend processes these photos to detect and group faces, enabling users to easily find pictures of themselves and others.

The project is built with a modern microservices architecture, comprising a web frontend, a main backend API, and a specialized computer vision service.

## Architecture

The application is divided into three main components:

1.  **`momnts-web` (Frontend):** A responsive and modern user interface built with React, Vite, and TypeScript. It handles all user interactions, including authentication, event creation, photo uploads, and viewing event galleries.

2.  **`momnts-api` (Backend API):** The core backend service built with Node.js, Express, and TypeScript. It manages user data, authentication, event logic, photo metadata, and communication with the database and background workers. It uses Prisma as its ORM for PostgreSQL.

3.  **`momnts-vision` (Vision Service):** A specialized Python microservice built with FastAPI. This service exposes endpoints for AI-powered computer vision tasks, including face detection in uploaded photos, generating face embeddings (vector representations), and matching faces to user profiles.

## Technology Stack

### `momnts-web` (Frontend)

-   **Framework:** React 19 with Vite
-   **Language:** TypeScript
-   **UI Components:** Shadcn UI, Lucide Icons, Radix UI
-   **Routing:** React Router
-   **State Management/Data Fetching:** TanStack Query
-   **Styling:** Tailwind CSS
-   **Forms:** TanStack Form
-   **Real-time Communication:** Socket.IO Client

### `momnts-api` (Backend)

-   **Runtime:** Bun
-   **Framework:** Express.js
-   **Language:** TypeScript
-   **Database:** PostgreSQL with the `vector` extension (for embeddings)
-   **ORM:** Prisma
-   **Authentication:** JSON Web Tokens (JWT) with refresh tokens
-   **Background Jobs:** BullMQ with Redis
-   **File Storage:** AWS S3 (inferred from `@aws-sdk/client-s3`)
-   **Real-time Communication:** Socket.IO

### `momnts-vision` (AI/ML)

-   **Framework:** FastAPI
-   **Language:** Python
-   **Core Libraries:**
    -   `deepface`: For core face recognition and analysis.
    -   `tensorflow`: As the backend for deep learning models.
    -   `opencv-python`: For image processing tasks.
    -   `retina-face`: For high-accuracy face detection.

## Features

-   **User Authentication:** Secure user registration and login with JWT.
-   **Event Management:** Organizers can create, manage, and share events with unique invite codes.
-   **Photo Uploads:** Attendees can upload photos to events, with limits set by the organizer.
-   **Automated Face Detection:** The `momnts-vision` service automatically detects faces in every uploaded photo.
-   **Face Recognition & Grouping:** Generates vector embeddings for each detected face and groups similar faces together across all photos in an event.
-   **Personalized Galleries:** Users can "claim" their face profile to quickly find all photos they appear in.
-   **Real-time Notifications:** Users are notified of important events (e.g., new photos, matches found) via WebSockets.
-   **Efficient Background Processing:** Photo processing and face matching are handled by background workers to ensure the API remains responsive.

## Getting Started

To run the project locally, you will need to set up each service in a separate terminal.

### Prerequisites

-   Node.js and Bun
-   Python 3.10+ and `pip`
-   PostgreSQL with the `pgvector` extension
-   Redis
-   Access to an AWS S3 bucket (or compatible service)

### 1. `momnts-api`

```bash
cd momnts-api
cp .env.example .env # Add your database, Redis, and S3 credentials
bun install
bun run dev
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