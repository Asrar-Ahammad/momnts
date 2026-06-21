import express from "express";
import type {Request, Response} from "express";
import cors from "cors"
import cookieParser from "cookie-parser"
import { createServer } from "http"
import sharp from "sharp"
import os from "os"

// Configure sharp for maximum performance
sharp.cache(false)
sharp.concurrency(Math.max(1, os.cpus().length - 1))
sharp.simd(true)

import { authRouter } from "./src/routes/auth.routes.js";
import { eventsRouter } from "./src/routes/events.routes.js";
import { photosRouter } from "./src/routes/photos.routes.js";
import { onboardingRouter } from "./src/routes/onboarding.routes.js";
import { usersRouter } from "./src/routes/users.routes.js";
import { galleryRouter } from "./src/routes/gallery.routes.js";
import { notificationsRouter } from "./src/routes/notifications.routes.js";
import { connectionsRouter } from "./src/routes/connections.routes.js";
import { commentsRouter } from "./src/routes/comments.routes.js";
import { subscriptionRouter } from "./src/routes/subscription.routes.js";
import { clerkRouter } from "./src/routes/clerk.routes.js";
import { initSocketIO } from "./src/lib/socket.js";

const app = express()
const httpServer = createServer(app)

// Initialize Socket.IO on the HTTP server
initSocketIO(httpServer)

app.use(cors({
  origin:process.env.CLIENT_APP_URL,
  credentials: true,
}))
// Clerk webhook must be mounted BEFORE express.json() so express.raw() on that
// route receives the unmodified body bytes that Svix signed.
app.use("/api/auth/clerk", clerkRouter)

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf
  }
}))
app.use(cookieParser())

app.get("/",(req:Request, res:Response)=>{
  res.send("Server is running")
})

app.use("/api/auth", authRouter)
app.use("/api/events", eventsRouter)
app.use("/api/events", galleryRouter)
app.use('/api/photos/:photoId/comments', commentsRouter)
app.use('/api/photos', photosRouter)
app.use('/api/onboarding', onboardingRouter)
app.use('/api/users', usersRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/events/:eventId/connections', connectionsRouter)
app.use('/api/subscription', subscriptionRouter)

const PORT = process.env.PORT || process.env.APP_PORT || 3000

httpServer.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`)
})

// Start background workers in the same process for production
import "./src/workers/photo.worker.js"
import "./src/workers/match.worker.js"