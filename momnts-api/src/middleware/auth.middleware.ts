import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
  };
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } | undefined;
}

/**
 * @name authenticate
 * @description Dual-path middleware: tries Clerk JWT first, falls back to legacy JWT.
 *              Produces identical req.user = { id, name } regardless of auth source.
 * @access Private
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // ── Try Clerk JWT first ──────────────────────────────────────────
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (clerkSecretKey) {
      try {
        // Clerk JWTs are standard JWTs signed by Clerk's RSA keys.
        // Decode without verification first to check if it's a Clerk token (has 'azp' claim).
        const unverified = jwt.decode(token, { complete: true });
        const payload = unverified?.payload as Record<string, unknown> | undefined;

        if (payload && payload.azp) {
          // This looks like a Clerk token — verify it properly
          // Clerk tokens use RS256. We verify using the Clerk backend API.
          const { verifyToken } = await import('@clerk/express');
          const clerkPayload = await verifyToken(token, { secretKey: clerkSecretKey });

          if (clerkPayload?.sub) {
            // Look up internal user by clerk_user_id
            let user = await prisma.user.findUnique({
              where: { clerk_user_id: clerkPayload.sub },
              select: { id: true, name: true },
            });

            if (!user) {
              // Fallback: If webhook hasn't created the user (e.g. local dev, webhook delay/failure),
              // dynamically fetch user details from Clerk and auto-provision the internal database record.
              try {
                const { createClerkClient } = await import('@clerk/express');
                const clerk = createClerkClient({ secretKey: clerkSecretKey });
                const clerkUser = await clerk.users.getUser(clerkPayload.sub);
                if (clerkUser) {
                  const email = clerkUser.emailAddresses?.[0]?.emailAddress;
                  const firstName = clerkUser.firstName || '';
                  const lastName = clerkUser.lastName || '';
                  const name = `${firstName} ${lastName}`.trim() || 'User';

                  if (email) {
                    // Check if user already exists by email (migration case)
                    const existing = await prisma.user.findUnique({ where: { email } });
                    if (existing) {
                      user = await prisma.user.update({
                        where: { id: existing.id },
                        data: {
                          clerk_user_id: clerkPayload.sub,
                          auth_provider: 'clerk',
                        },
                        select: { id: true, name: true },
                      });
                      console.log(`[Auth Middleware] Linked existing user ${existing.id} to Clerk ${clerkPayload.sub}`);
                    } else {
                      // Create new internal user
                      user = await prisma.user.create({
                        data: {
                          name,
                          email,
                          password_hash: null,
                          email_verified: true, // Clerk verified OAuth email
                          clerk_user_id: clerkPayload.sub,
                          auth_provider: 'clerk',
                        },
                        select: { id: true, name: true },
                      });

                      // Create default FREE subscription
                      await prisma.subscription.create({
                        data: {
                          user_id: user.id,
                          plan: 'FREE',
                        },
                      });
                      console.log(`[Auth Middleware] Auto-provisioned user ${user.id} for Clerk ${clerkPayload.sub}`);
                    }
                  }
                }
              } catch (autoProvisionError) {
                console.error('[Auth Middleware] Auto-provisioning failed:', autoProvisionError);
              }
            }

            if (user) {
              req.user = { id: user.id, name: user.name };
              return next();
            }

            // Clerk user exists but no internal user yet — might be a race
            // condition with webhook. Return 401 so client can retry.
            return res.status(401).json({
              message: "Account setup in progress. Please try again in a moment.",
              code: "CLERK_USER_NOT_LINKED",
            });
          }
        }
      } catch (clerkError) {
        // Not a valid Clerk token — fall through to legacy JWT
      }
    }

    // ── Legacy JWT path (unchanged) ──────────────────────────────────

    // Check if token is blacklisted
    const blacklistedToken = await prisma.blacklist.findUnique({
      where: { token },
    });

    if (blacklistedToken) {
      return res.status(401).json({ message: "Token has been invalidated" });
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    const decoded = jwt.verify(token, jwtSecret) as unknown as {
      id: string;
      name: string;
      sessionId?: string;
    };

    if (decoded.sessionId) {
      const activeSession = await prisma.refreshToken.findUnique({
        where: { id: decoded.sessionId }
      });
      if (!activeSession) {
        return res.status(401).json({ message: "Session has been revoked" });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}
