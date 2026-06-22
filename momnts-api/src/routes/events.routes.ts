import { Router } from "express";
import { 
    createEventController, 
    deleteEventController, 
    generateUniqueInviteCode, 
    getEventAttendeesController, 
    getEventDetailsController, 
    getEventsController, 
    getJoinedEventsController, 
    joinEventController, 
    leaveEventController,
    updateEventDetailsController,
    updateAttendeeLimitController,
    removeAttendeeController,
    getJoinRequestsController,
    handleJoinRequestController,
    getPendingRequestCountController,
    getEventChatKeyController
} from "../controllers/events.controller";
import { authenticate } from "../middleware/auth.middleware";
import { attachPlan } from "../middleware/plan.middleware";

const eventsRouter = Router();

// Create event
eventsRouter.post("/create", authenticate, attachPlan, createEventController);

// Get events
eventsRouter.get("/my-events", authenticate, getEventsController);

// Get joined events - MUST be before /:eventId
eventsRouter.get("/joined", authenticate, getJoinedEventsController);

// Join event
eventsRouter.post("/join", authenticate, attachPlan, joinEventController);

// Get event details
eventsRouter.get("/:eventId", authenticate, getEventDetailsController);

// Get event chat key
eventsRouter.get("/:eventId/chat-key", authenticate, getEventChatKeyController);

// Update event details
eventsRouter.put("/:eventId", authenticate, attachPlan, updateEventDetailsController);

// Delete event
eventsRouter.delete("/:eventId", authenticate, deleteEventController)

// Get event attendees
eventsRouter.get("/:eventId/attendees", authenticate, getEventAttendeesController)

// Update attendee limit
eventsRouter.put("/:eventId/attendees/:userId/limit", authenticate, updateAttendeeLimitController)

// Remove attendee
eventsRouter.delete("/:eventId/attendees/:userId", authenticate, removeAttendeeController)

// Join requests (organizer only)
eventsRouter.get("/:eventId/requests", authenticate, getJoinRequestsController)
eventsRouter.get("/:eventId/requests/count", authenticate, getPendingRequestCountController)
eventsRouter.put("/:eventId/requests/:requestId", authenticate, handleJoinRequestController)

// Regenerate invite code (organizer only — if code is compromised)
eventsRouter.patch("/:eventId/regenerate-code", authenticate, generateUniqueInviteCode)

// Leave event (attendee only)
eventsRouter.post("/:eventId/leave", authenticate, leaveEventController)


export { eventsRouter };