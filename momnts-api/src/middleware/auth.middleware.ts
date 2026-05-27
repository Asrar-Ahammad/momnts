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
 * @description Middleware to authenticate user using JWT token and check blacklist
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
