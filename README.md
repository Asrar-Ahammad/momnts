# Momnts — AI-Powered Event Photo Sharing

Momnts is a full-stack, identity-based photo retrieval system designed for events. Organizers create events and manage limits, while attendees join via invite codes and upload photos. An asynchronous background pipeline processes uploaded photos using a computer vision microservice to detect faces, generate vector embeddings, and group them. Attendees upload a selfie to claim their face profile and instantly retrieve all photos featuring them.

---

## System Architecture

Momnts uses a microservices architecture consisting of three main components:

```
                  ┌──────────────┐
                  │  momnts-web  │
                  └──────┬───────┘
                         │ REST / WebSockets
                         ▼
                  ┌──────────────┐
                  │  momnts-api  │◀─────────┐
                  └──────┬───────┘          │
          REST / S3 API  │                  │ BullMQ Jobs
                         ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Cloudflare R2 │  │ PostgreSQL + │  │   Redis +    │
│  (Storage)   │  │  pgvector    │  │ BullMQ Worker│
└──────────────┘  └──────┬───────┘  └──────┬───────┘
                         │                 │
                         ▼                 ▼
                  ┌────────────────────────┐
                  │     momnts-vision      │
                  │   (FastAPI / DeepFace) │
                  └────────────────────────┘
```

1. **momnts-web (Frontend):** React (Vite) single page application. Manages user sessions, real-time updates via WebSockets, event dashboards, photo upload streams, and galleries.
2. **momnts-api (Backend):** TypeScript/Node.js runtime (using Bun). Handles core API endpoints, authorization checks, storage orchestration (Cloudflare R2), database mutations (Prisma), and queues heavy background processing.
3. **momnts-vision (AI/Vision Service):** Python microservice powered by FastAPI. Houses DeepFace, RetinaFace, and TensorFlow weights for cropping faces and generating 512-dimension face vectors.

---

## Core Domain Model & Database Schema

Database schema runs on PostgreSQL with the pgvector extension enabled for storing high-dimensional embeddings.

* **User**: Handles registration, credentials, and verification status. Holds user's global selfie URL and its generated selfie_embedding vector.
* **Event**: Specific photo-sharing events containing location, scheduled dates, attendee upload limits, active status, and unique invite_code.
* **EventAccess**: Junction table mapping a User to an Event. Restricts access, defines roles (ORGANIZER or ATTENDEE), and counts total uploads against the limit.
* **Photo**: Holds metadata for individual uploads. Stores the original image, display-optimized images, and generated thumbnails URLs inside R2 storage, along with processing status flags.
* **FaceProfile**: Represents a unique person detected in photos within a specific event. Contains the central clustering embedding_vector and details whether a user has claimed the profile.
* **PhotoFace**: Maps specific bounding box coordinates (bbox_x, bbox_y, bbox_w, bbox_h) inside a parent Photo to a unique FaceProfile.
* **RefreshToken / Blacklist**: Manage security sessions, token rotations, and token revocations.
* **Notification**: Powers real-time user updates via socket-driven payloads.
* **Favourite / Comment**: Models interactive user engagements on event photos.
* **JoinRequest**: Mappings for secure event access controls.
* **Subscription**: Handles user-level billing and usage tiers (FREE or PRO).

---

## Security & Data Isolation

### Event-Scoping Requirement
To prevent cross-tenant data leakage, all data must be strictly scoped by event_id. Users must never be allowed to view photos, comments, or face profiles for events where they do not possess a valid EventAccess record.

### Access Control Rules
* **Event Membership**: Checked exclusively against the EventAccess junction table. Never filter queries relying on the Event.user_id field, as events do not belong to a single owner.
* **Role Privileges**:
  * ORGANIZER (Creator): Full authority to update/delete events, invite users, remove photos, regenerate invite codes, and set upload limits.
  * ATTENDEE: Permitted to join events, upload photos within organizer-specified limits, view event galleries, comment on photos, and claim their face profiles.

---

## Core Application Flows

### 1. Photo Upload Pipeline
1. An attendee uploads a photo through the web app.
2. The Node API uploads the high-res file to Cloudflare R2 storage, generates display and thumbnail variations, saves a Photo database record with processed = false, and publishes a background job to BullMQ.

### 2. Async Face Processing (Workers)
1. The BullMQ worker picks up the job and sends the image to momnts-vision /detect.
2. The vision microservice runs RetinaFace to find face bounding boxes, cropping, and generating a 512-dimension vector embedding for each detected face.
3. For each returned face vector:
  * The system queries the database using pgvector distance functions (<=> cosine distance) to find existing FaceProfile matches inside the event boundaries.
  * If a close profile is found (distance below predefined threshold), a PhotoFace mapping is created linking the face box to the matching profile.
  * Otherwise, a new FaceProfile is instantiated for the event, and the PhotoFace is linked to it.
4. The photo's database record is updated to processed = true.

### 3. Selfie Matching & Retrieval
1. An attendee uploads their selfie inside an event.
2. The system generates the selfie vector embedding.
3. It performs a vector similarity search across all unclaimed FaceProfiles inside that specific event.
4. When a match is found, the profile is flagged as claimed (is_claimed = true) and linked directly to the user's account (claimed_by = user_id).
5. The attendee can now instantly view their personalized gallery containing all photos where their face profile is mapped.

---

## Technology Stack

### momnts-web (Frontend)
- Framework: React 19 + Vite + TypeScript
- Styling: Tailwind CSS + Phosphor Icons
- Components: Shadcn UI
- Data Flow: TanStack Query + React Router
- Sockets: Socket.IO Client for real-time notifications

### momnts-api (Backend)
- Runtime: Bun
- Framework: Express.js + TypeScript
- ORM: Prisma ORM (v7)
- Queue Engine: BullMQ + Redis
- Database: PostgreSQL with pgvector extension
- Storage: Cloudflare R2 Object Storage (compatible with @aws-sdk/client-s3)
- Notifications: Socket.IO for server-sent events

### momnts-vision (AI/Vision)
- Framework: FastAPI + Python 3.10+
- Libraries: DeepFace, OpenCV, TensorFlow, RetinaFace

---

## Local Installation & Run Guide

### Prerequisites
- Node.js (18+) or Bun runtime
- Python 3.10+
- PostgreSQL with pgvector extension installed
- Redis server running locally

---

### Step-by-Step Configuration

#### 1. Backend Service (momnts-api)
Navigate to the directory and install dependencies:
```bash
cd momnts-api
bun install
```

Configure your environment variables by creating `.env`:
```ini
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db>?schema=public"
JWT_SECRET="<your-secure-jwt-secret>"
AUTH_REFRESH_SECRET="<your-secure-refresh-jwt-secret>"
AUTH_SECRET_EXPIRES_IN="15m"
AUTH_REFRESH_SECRET_EXPIRES_IN="24h"
APP_HOST="localhost"
APP_PORT=3000
PYTHON_SERVICE_URL="http://localhost:8000"
CLIENT_APP_URL="http://localhost:5173"

# Cloudflare R2 or AWS S3 Compatible Storage
R2_ACCOUNT_ID="<your-r2-account-id>"
R2_ACCESS_KEY_ID="<your-r2-access-key-id>"
R2_SECRET_ACCESS_KEY="<your-r2-secret-access-key>"
R2_BUCKET_NAME="<your-bucket-name>"
R2_PUBLIC_URL="https://<public-bucket-domain>"
R2_ENDPOINT_URL="https://<account-id>.r2.cloudflarestorage.com"

# BullMQ Engine
REDIS_URL="redis://localhost:6379"
```

Apply database migrations:
```bash
bun prisma migrate dev
```

Start the service in development mode:
```bash
bun run dev
```

---

#### 2. Computer Vision Service (momnts-vision)
Navigate to the directory, build the virtual environment, and install dependencies:
```bash
cd momnts-vision
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Configure your API port:
```bash
echo "PORT=8000" > .env
```

Start the FastAPI application server:
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

---

#### 3. Web Dashboard (momnts-web)
Navigate to the directory and install dependencies:
```bash
cd momnts-web
bun install
```

Point the client to your backend server in `.env`:
```ini
SERVER_URL="http://localhost:3000"
```

Run Vite dev client:
```bash
bun run dev
```

---

## Critical Development Constraints

1. **Strict Isolation Scoping:** Do NOT perform any database queries that do not filter on event_id unless absolutely necessary (like global user registration). This protects private user galleries.
2. **Use EventAccess for Permissions:** Do NOT query the Event table to check if a user is authorized to add images or comments. Always verify permissions against EventAccess.
3. **Non-Blocking APIs:** Never execute face matching or deep learning processes inline inside web request-response loops. Offload them to BullMQ background workers.
4. **Vector Constraints:** Model embeddings use a fixed vector size of 512 dimensions. Ensure database schemas and FastAPI DeepFace models are aligned to this format.