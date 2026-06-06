/**
 * Central plan limits configuration.
 * All limit enforcement reads from here — single source of truth.
 */

export const PLAN_LIMITS = {
  FREE: {
    maxEvents: 3,                    // lifetime created events (organizer only)
    maxAttendeesPerEvent: 25,
    maxOrganizerUploadsPerEvent: 50,
    maxAttendeeUploadsPerEvent: 10,
    maxSecureEvents: 1,
    canRegenerateInviteCode: true,
  },
  PRO: {
    maxEvents: Infinity,
    maxAttendeesPerEvent: 150,
    maxOrganizerUploadsPerEvent: 500,
    maxAttendeeUploadsPerEvent: 20,
    maxSecureEvents: Infinity,
    canRegenerateInviteCode: true,
  },
} as const

export type PlanType = keyof typeof PLAN_LIMITS
export type PlanLimits = typeof PLAN_LIMITS[PlanType]
