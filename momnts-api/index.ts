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
import { initSocketIO } from "./src/lib/socket.js";

const app = express()
const httpServer = createServer(app)

// Initialize Socket.IO on the HTTP server
initSocketIO(httpServer)

app.use(cors({
  origin:process.env.CLIENT_APP_URL,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

app.get("/",(req:Request, res:Response)=>{
  res.send("Server is running")
})

app.use("/api/auth", authRouter)
app.use("/api/events", eventsRouter)
app.use("/api/events", galleryRouter)
app.use('/api/photos', photosRouter)
app.use('/api/onboarding', onboardingRouter)
app.use('/api/users', usersRouter)

httpServer.listen(process.env.APP_PORT, ()=> {
  console.log(`Server is running at http://localhost:${process.env.APP_PORT}`)
})