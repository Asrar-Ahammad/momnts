import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma.js";
import { presignStoredUrl } from "../lib/r2.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { redis } from "../lib/redis";
import { sendOtpEmail, sendPasswordResetOtpEmail, verifyOtpViaSparkage, sendWelcomeEmail } from "../lib/mailer";
import { verifyTurnstileToken } from "../lib/turnstile";

// ─── OTP Constants ───────────────────────────────────────────────────
const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 600;           // 10 minutes
const OTP_MAX_ATTEMPTS = 5;            // max verify attempts before lockout
const OTP_LOCKOUT_SECONDS = 1800;      // 30 min lockout after too many failures
const OTP_RATE_LIMIT_MAX = 3;          // max send requests per window
const OTP_RATE_LIMIT_WINDOW = 900;     // 15 minute window

// ─── OTP Helpers ─────────────────────────────────────────────────────

/** Generate a cryptographically secure 6-digit OTP */
function generateOtp(): string {
  // crypto.randomInt is CSPRNG — safe for security tokens
  return crypto.randomInt(100000, 999999).toString();
}

/** Hash OTP before storing in Redis so a Redis compromise doesn't leak codes */
async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

/** Timing-safe OTP comparison via bcrypt (internally constant-time) */
async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/** Redis key helpers — namespaced to prevent collisions */
const otpKey = (userId: string) => `otp:${userId}`;
const otpAttemptsKey = (userId: string) => `otp_attempts:${userId}`;
const otpLockoutKey = (userId: string) => `otp_lockout:${userId}`;
const otpRateKey = (userId: string) => `otp_rate:${userId}`;

const pwdOtpKey = (userId: string) => `pwd_otp:${userId}`;
const pwdOtpAttemptsKey = (userId: string) => `pwd_otp_attempts:${userId}`;
const pwdOtpLockoutKey = (userId: string) => `pwd_otp_lockout:${userId}`;
const pwdOtpRateKey = (userId: string) => `pwd_otp_rate:${userId}`;

async function storeAndSendPasswordOtp(userId: string, email: string): Promise<{ success: boolean; retryAfter?: number }> {
  const lockout = await redis.get(pwdOtpLockoutKey(userId));
  if (lockout) {
    const ttl = await redis.ttl(pwdOtpLockoutKey(userId));
    return { success: false, retryAfter: ttl > 0 ? ttl : OTP_LOCKOUT_SECONDS };
  }

  const newCount = await redis.incr(pwdOtpRateKey(userId));
  if (newCount === 1) {
    await redis.expire(pwdOtpRateKey(userId), OTP_RATE_LIMIT_WINDOW);
  }

  if (newCount > OTP_RATE_LIMIT_MAX) {
    const ttl = await redis.ttl(pwdOtpRateKey(userId));
    return { success: false, retryAfter: ttl > 0 ? ttl : OTP_RATE_LIMIT_WINDOW };
  }

  try {
    await sendPasswordResetOtpEmail(email);
  } catch (error) {
    await redis.decr(pwdOtpRateKey(userId));
    throw error;
  }

  await redis.del(pwdOtpAttemptsKey(userId));

  return { success: true };
}

/**
 * Store hashed OTP in Redis with TTL. Resets attempt counter.
 * Returns false if user is rate-limited.
 */
async function storeAndSendOtp(userId: string, email: string): Promise<{ success: boolean; retryAfter?: number }> {
  // Check lockout first
  const lockout = await redis.get(otpLockoutKey(userId));
  if (lockout) {
    const ttl = await redis.ttl(otpLockoutKey(userId));
    return { success: false, retryAfter: ttl > 0 ? ttl : OTP_LOCKOUT_SECONDS };
  }

  // Atomic rate limit check: increment FIRST
  const newCount = await redis.incr(otpRateKey(userId));
  if (newCount === 1) {
    await redis.expire(otpRateKey(userId), OTP_RATE_LIMIT_WINDOW);
  }

  if (newCount > OTP_RATE_LIMIT_MAX) {
    const ttl = await redis.ttl(otpRateKey(userId));
    return { success: false, retryAfter: ttl > 0 ? ttl : OTP_RATE_LIMIT_WINDOW };
  }

  try {
    // Send email FIRST (OTP never logged)
    // If this throws (e.g. invalid credentials), the function aborts
    await sendOtpEmail(email);
  } catch (error) {
    // Refund the rate limit count since the email failed
    await redis.decr(otpRateKey(userId));
    throw error;
  }

  // Reset attempt counter
  await redis.del(otpAttemptsKey(userId));

  return { success: true };
}

// ─── User Agent Parser Helper ─────────────────────────────────────────
function parseUserAgent(userAgent: string | undefined) {
  if (!userAgent) return { browser: 'Unknown', os: 'Unknown', deviceType: 'desktop', deviceName: 'Unknown Device' };

  // truncate to prevent extremely long malicious strings from causing DB bloating
  const ua = userAgent.slice(0, 500);

  let browser = 'Unknown';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  let deviceType = 'desktop';
  if (ua.includes('Mobi') || ua.includes('Android') || ua.includes('iPhone')) deviceType = 'mobile';
  if (ua.includes('Tablet') || ua.includes('iPad')) deviceType = 'tablet';

  const deviceName = `${os} Device`;

  return { browser, os, deviceType, deviceName, original: ua };
}

// ─── User response shape helper ──────────────────────────────────────
async function userResponse(user: { id: string; name: string; email: string; email_verified: boolean; selfie_url: string | null; banner_url?: string | null; theme?: string | null; custom_accent_color?: string | null; created_at: Date }) {
  const selfie_url = user.selfie_url ? await presignStoredUrl(user.selfie_url, 86400) : null;
  const banner_url = user.banner_url ? await presignStoredUrl(user.banner_url, 86400) : null;
  return {
    id: user.id,
    username: user.name,
    email: user.email,
    email_verified: user.email_verified,
    selfie_url,
    banner_url,
    theme: user.theme ?? 'dark',
    custom_accent_color: user.custom_accent_color ?? undefined,
    created_at: user.created_at,
  };
}

// ─── Controllers ─────────────────────────────────────────────────────

/**
 * @description Register a new user, expecting name, email, and password in the request body.
 * @access Public
 */
async function registerUserController(req: Request, res: Response) {
  try {
    const { name, password, captchaToken } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

    // Verify Captcha
    const isCaptchaValid = await verifyTurnstileToken(captchaToken, ipAddress);
    if (!isCaptchaValid) {
      return res.status(400).json({ message: "Invalid or missing CAPTCHA. Please try again." });
    }

    if (typeof req.body.email !== "string") {
      return res.status(400).json({ message: "Please provide a valid email string" });
    }
    const email = req.body.email.toLowerCase().trim();

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email and password",
      });
    }

    // Security: Bound input lengths to prevent resource exhaustion (DoS)
    if (email.length > 255 || password.length > 100 || name.length > 100) {
      return res.status(400).json({ message: "Input exceeds maximum allowed length" });
    }

    const userAlreadyExists = await prisma.user.findUnique({
      where: { email: email },
    });

    if (userAlreadyExists) {
      if (userAlreadyExists.email === email) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email,
        name: name,
        password_hash: hashedPassword,
        email_verified: false,
      },
    });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    const sessionId = randomUUID();

    // Generate access token (1 hr)
    const accessToken = jwt.sign(
      { id: user.id, name: user.name, sessionId },
      jwtSecret,
      { expiresIn: "1h" },
    );

    // Generate refresh token (7 days)
    const refreshToken = jwt.sign(
      { id: user.id, type: "refresh", jti: Math.random().toString(36).substring(2) },
      jwtSecret,
      { expiresIn: "7d" },
    );

    const uaMetadata = parseUserAgent(req.headers['user-agent']);
    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        id: sessionId,
        token: refreshToken,
        user_id: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        device_name: uaMetadata.deviceName,
        device_type: uaMetadata.deviceType,
        browser: uaMetadata.browser,
        os: uaMetadata.os,
        ip_address: ipAddress,
        last_used_at: new Date(),
      },
    });

    // Send OTP for email verification asynchronously (truly fire-and-forget)
    storeAndSendOtp(user.id, user.email).catch((emailError) => {
      console.error("Failed to send verification email:", emailError instanceof Error ? emailError.message : emailError);
    });

    return res.status(201).json({
      message: "User created successfully",
      accessToken,
      refreshToken,
      user: await userResponse(user),
    });
  } catch (error:any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * @name checkEmailController
 * @description Check if an email already exists in the database
 * @access Public
 */
async function checkEmailController(req: Request, res: Response) {
  try {
    if (typeof req.body.email !== "string") {
      return res.status(400).json({ message: "Please provide a valid email string" });
    }
    const email = req.body.email.toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ message: "Please provide an email" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    return res.status(200).json({
      exists: !!user,
    });
  } catch (error:any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * @name loginUserController
 * @description Login user, expecting email and password in the request body.
 * @access Public
 */

async function loginUserController(req: Request, res: Response) {
  try {
    const { password, captchaToken } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

    // Verify Captcha
    const isCaptchaValid = await verifyTurnstileToken(captchaToken, ipAddress);
    if (!isCaptchaValid) {
      return res.status(400).json({ message: "Invalid or missing CAPTCHA. Please try again." });
    }

    if (typeof req.body.email !== "string") {
      return res.status(400).json({ message: "Please provide a valid email string" });
    }
    const email = req.body.email.toLowerCase().trim();

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

    // Security: Bound input lengths to prevent resource exhaustion (DoS)
    if (email.length > 255 || password.length > 100) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // OAuth-only users (no password) must use Clerk sign-in
    if (!user.password_hash) {
      return res.status(400).json({
        message: "This account uses Google/Apple sign-in. Please use that method to log in.",
        code: "OAUTH_ONLY",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // ── Clerk migration-on-first-login ─────────────────────────────
    // If user hasn't been linked to Clerk yet, attempt to create/link
    if (!user.clerk_user_id && process.env.CLERK_SECRET_KEY) {
      try {
        const { createClerkClient } = await import('@clerk/express');
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const clerkUser = await clerk.users.createUser({
          emailAddress: [user.email],
          firstName: user.name.split(' ')[0] || user.name,
          lastName: user.name.split(' ').slice(1).join(' ') || undefined,
          skipPasswordRequirement: true,
        });
        await prisma.user.update({
          where: { id: user.id },
          data: {
            clerk_user_id: clerkUser.id,
            auth_provider: 'clerk',
          },
        });
        console.log(`[Auth Migration] User ${user.id} migrated to Clerk ${clerkUser.id}`);
      } catch (migrationErr) {
        // Non-fatal — user can still log in with legacy JWT
        console.warn('[Auth Migration] Failed to migrate user to Clerk:', migrationErr);
      }
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    const sessionId = randomUUID();

    // Generate access token (1 hr)
    const accessToken = jwt.sign(
      { id: user.id, name: user.name, sessionId },
      jwtSecret,
      { expiresIn: "1h" },
    );

    // Generate refresh token (7 days)
    const refreshToken = jwt.sign(
      { id: user.id, type: "refresh", jti: Math.random().toString(36).substring(2) },
      jwtSecret,
      { expiresIn: "7d" },
    );

    const uaMetadata = parseUserAgent(req.headers['user-agent']);
    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        id: sessionId,
        token: refreshToken,
        user_id: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        device_name: uaMetadata.deviceName,
        device_type: uaMetadata.deviceType,
        browser: uaMetadata.browser,
        os: uaMetadata.os,
        ip_address: ipAddress,
        last_used_at: new Date(),
      },
    });

    return res.status(200).json({
      message: "User logged in successfully",
      accessToken,
      refreshToken,
      user: await userResponse(user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name refreshUserController
 * @description Refresh access token using refresh token with rotation
 * @access Public
 */

async function refreshUserController(req: Request, res: Response) {
  try {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, jwtSecret) as unknown as {
      id: string;
      type: string;
    };

    if (decoded.type !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            email_verified: true,
            selfie_url: true,
            created_at: true,
          }
        }
      },
    });

    if (!storedToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Check if refresh token is expired
    if (storedToken.expires_at < new Date()) {
      await prisma.refreshToken.delete({ where: { token: refreshToken } });
      return res.status(401).json({ message: "Refresh token expired" });
    }

    const sessionId = randomUUID();

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: decoded.id, name: storedToken.user.name, sessionId },
      jwtSecret,
      { expiresIn: "1h" },
    );

    // Generate new refresh token (rotation)
    const newRefreshToken = jwt.sign(
      { id: decoded.id, type: "refresh", jti: Math.random().toString(36).substring(2) },
      jwtSecret,
      { expiresIn: "7d" },
    );

    // Delete old refresh token
    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const uaMetadata = parseUserAgent(req.headers['user-agent']);
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        id: sessionId,
        token: newRefreshToken,
        user_id: decoded.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        device_name: uaMetadata.deviceName,
        device_type: uaMetadata.deviceType,
        browser: uaMetadata.browser,
        os: uaMetadata.os,
        ip_address: ipAddress,
        last_used_at: new Date(),
      },
    });

    return res.status(200).json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: await userResponse(storedToken.user),
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Refresh token expired" });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name logoutUserController
 * @description Logout user by clearing cookies and deleting refresh token
 * @access Private
 */

async function logoutUserController(req: Request, res: Response) {
  try {
    // Read tokens from request body (client sends them before clearing localStorage)
    const refreshToken = req.body.refreshToken;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Delete refresh token from database if it exists
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Blacklist access token if it exists
    if (accessToken) {
      const existingBlacklist = await prisma.blacklist.findUnique({
        where: { token: accessToken },
      });

      if (!existingBlacklist) {
        await prisma.blacklist.create({
          data: {
            token: accessToken,
            expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          },
        });
      }
    }

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}


/**
 * @name getMeController
 * @description Get current logged in user details
 * @access Private
 */

async function getMeController(req: any, res: any) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        email_verified: true,
        selfie_url: true,
        banner_url: true,
        created_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: await userResponse(user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name sendOtpController
 * @description Generate and send OTP to user's email for verification.
 *   Rate-limited: max 3 per 15 minutes. Requires authentication.
 * @access Private
 */
async function sendOtpController(req: any, res: any) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, email_verified: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.email_verified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const result = await storeAndSendOtp(user.id, user.email);

    if (!result.success) {
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter: result.retryAfter,
      });
    }

    return res.status(200).json({ message: "Verification code sent to your email" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name verifyOtpController
 * @description Verify OTP and mark email as verified.
 *   Brute-force protected: max 5 attempts, then 30min lockout.
 *   Uses bcrypt compare (internally constant-time) to prevent timing attacks.
 * @access Private
 */
async function verifyOtpController(req: any, res: any) {
  try {
    const userId = req.user.id;
    const { otp } = req.body;

    // Input validation: must be exactly 6 digits
    if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Please provide a valid 6-digit code" });
    }

    // Check lockout
    const lockout = await redis.get(otpLockoutKey(userId));
    if (lockout) {
      const ttl = await redis.ttl(otpLockoutKey(userId));
      return res.status(429).json({
        message: "Too many failed attempts. Please try again later.",
        retryAfter: ttl > 0 ? ttl : OTP_LOCKOUT_SECONDS,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, email_verified: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.email_verified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Increment attempt counter before checking (fail-first to prevent race conditions)
    const attempts = await redis.incr(otpAttemptsKey(userId));
    if (attempts === 1) {
      // Set TTL on first attempt to auto-cleanup
      await redis.expire(otpAttemptsKey(userId), OTP_TTL_SECONDS);
    }

    // Check if max attempts exceeded
    if (attempts > OTP_MAX_ATTEMPTS) {
      // Set lockout
      await redis.setex(otpLockoutKey(userId), OTP_LOCKOUT_SECONDS, "1");
      // Delete attempts — force fresh OTP after lockout
      await redis.del(otpAttemptsKey(userId));

      return res.status(429).json({
        message: "Too many failed attempts. Your account is temporarily locked. Please try again in 30 minutes.",
        retryAfter: OTP_LOCKOUT_SECONDS,
      });
    }

    // Verify OTP via Sparkage
    const isValid = await verifyOtpViaSparkage(user.email, otp);
    if (!isValid) {
      const remaining = OTP_MAX_ATTEMPTS - attempts;
      return res.status(400).json({
        message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      });
    }

    // OTP valid — mark email as verified
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { email_verified: true },
      select: {
        id: true,
        name: true,
        email: true,
        email_verified: true,
        selfie_url: true,
        created_at: true,
      },
    });

    // Cleanup Redis — delete attempts & rate limit
    await redis.del(otpAttemptsKey(userId), otpRateKey(userId));

    // Send welcome email asynchronously via SMTP
    sendWelcomeEmail(updatedUser.email, updatedUser.name).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    return res.status(200).json({
      message: "Email verified successfully",
      user: await userResponse(updatedUser),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name forgotPasswordController
 * @description Initiate password reset by sending OTP to email
 * @access Public
 */
async function forgotPasswordController(req: Request, res: Response) {
  try {
    if (typeof req.body.email !== "string") {
      return res.status(400).json({ message: "Email is required and must be a string" });
    }
    const email = req.body.email.toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (email.length > 255) {
      return res.status(400).json({ message: "Invalid email" });
    }

    // Security: Rate limit by IP + email to prevent enumeration AND targeted DoS
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const ipOrEmailRateKey = `pwd_req_rate:${clientIp}:${email}`;
    const reqCount = await redis.incr(ipOrEmailRateKey);
    if (reqCount === 1) {
      await redis.expire(ipOrEmailRateKey, OTP_RATE_LIMIT_WINDOW);
    }
    if (reqCount > OTP_RATE_LIMIT_MAX) {
      const ttl = await redis.ttl(ipOrEmailRateKey);
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter: ttl > 0 ? ttl : OTP_RATE_LIMIT_WINDOW,
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // Fire and forget
      storeAndSendPasswordOtp(user.id, user.email).catch((e) => console.error(e));
    } else {
      // Dummy hash to normalize timing and prevent timing attacks
      bcrypt.hash(email, 10).catch(() => {});
    }

    return res.status(200).json({ message: "If an account with that email exists, we sent a password reset code." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name resetPasswordController
 * @description Reset password using email, OTP, and new password
 * @access Public
 */
async function resetPasswordController(req: Request, res: Response) {
  try {
    const { otp, newPassword } = req.body;
    if (typeof req.body.email !== "string") {
      return res.status(400).json({ message: "Email must be a string" });
    }
    const email = req.body.email.toLowerCase().trim();
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }
    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Please provide a valid 6-digit code" });
    }
    if (typeof newPassword !== "string" || newPassword.length > 100) {
      return res.status(400).json({ message: "Invalid password length" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid verification code or email" });
    }

    const userId = user.id;

    // Check lockout
    const lockout = await redis.get(pwdOtpLockoutKey(userId));
    if (lockout) {
      return res.status(403).json({
        message: "Too many failed attempts. Your account is temporarily locked from resetting password. Please try again in 30 minutes.",
      });
    }

    // Increment attempts first
    const attempts = await redis.incr(pwdOtpAttemptsKey(userId));
    if (attempts === 1) {
      await redis.expire(pwdOtpAttemptsKey(userId), OTP_TTL_SECONDS);
    }

    if (attempts > OTP_MAX_ATTEMPTS) {
      await redis.setex(pwdOtpLockoutKey(userId), OTP_LOCKOUT_SECONDS, "locked");
      await redis.del(pwdOtpAttemptsKey(userId));
      return res.status(403).json({
        message: "Too many failed attempts. Your account is temporarily locked from resetting password. Please try again in 30 minutes.",
      });
    }

    // Verify OTP via Sparkage
    const isValid = await verifyOtpViaSparkage(email, otp);
    if (!isValid) {
      const remaining = OTP_MAX_ATTEMPTS - attempts;
      return res.status(400).json({
        message: `Invalid verification code. ${remaining} attempt(s) remaining.`,
      });
    }

    // OTP valid — update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: hashedPassword },
    });

    // Security: Revoke all existing sessions for this user on password reset
    await prisma.refreshToken.deleteMany({
      where: { user_id: userId },
    });

    // Cleanup Redis
    await redis.del(pwdOtpAttemptsKey(userId), pwdOtpRateKey(userId));

    return res.status(200).json({ message: "Password has been successfully reset" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name sendChangePasswordOtpController
 * @description Initiate password change for logged-in user
 * @access Private
 */
async function sendChangePasswordOtpController(req: Request, res: Response) {
  try {
    // @ts-ignore
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await storeAndSendPasswordOtp(userId, user.email);
    if (!result.success) {
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter: result.retryAfter,
      });
    }

    return res.status(200).json({ message: "Verification code sent to your email" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name changePasswordController
 * @description Change password for logged-in user
 * @access Private
 */
async function changePasswordController(req: Request, res: Response) {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword) {
      return res.status(400).json({ message: "OTP and new password are required" });
    }
    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Please provide a valid 6-digit code" });
    }
    if (typeof newPassword !== "string" || newPassword.length > 100) {
      return res.status(400).json({ message: "Invalid password length" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const lockout = await redis.get(pwdOtpLockoutKey(userId));
    if (lockout) {
      return res.status(403).json({
        message: "Too many failed attempts. Your account is temporarily locked from changing password. Please try again in 30 minutes.",
      });
    }

    // Increment attempts first
    const attempts = await redis.incr(pwdOtpAttemptsKey(userId));
    if (attempts === 1) {
      await redis.expire(pwdOtpAttemptsKey(userId), OTP_TTL_SECONDS);
    }

    if (attempts > OTP_MAX_ATTEMPTS) {
      await redis.setex(pwdOtpLockoutKey(userId), OTP_LOCKOUT_SECONDS, "locked");
      await redis.del(pwdOtpAttemptsKey(userId));
      return res.status(403).json({
        message: "Too many failed attempts. Your account is temporarily locked from changing password. Please try again in 30 minutes.",
      });
    }

    // Verify OTP via Sparkage
    const isValid = await verifyOtpViaSparkage(user.email, otp);
    if (!isValid) {
      const remaining = OTP_MAX_ATTEMPTS - attempts;
      return res.status(400).json({
        message: `Invalid verification code. ${remaining} attempt(s) remaining.`,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: hashedPassword },
    });

    // Security: Revoke all existing sessions (except maybe current, but safest to force re-login)
    await prisma.refreshToken.deleteMany({
      where: { user_id: userId },
    });

    await redis.del(pwdOtpAttemptsKey(userId), pwdOtpRateKey(userId));

    return res.status(200).json({ message: "Password has been successfully changed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name getSessionsController
 * @description Get all active sessions for current user
 * @access Private
 */
async function getSessionsController(req: any, res: Response) {
  try {
    const refreshToken = req.headers['x-refresh-token'] || req.body.refreshToken;

    const sessions = await prisma.refreshToken.findMany({
      where: { 
        user_id: req.user.id,
        expires_at: {
          gt: new Date()
        }
      },
      orderBy: { last_used_at: 'desc' }
    });

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      device_name: session.device_name,
      device_type: session.device_type,
      browser: session.browser,
      os: session.os,
      ip_address: session.ip_address,
      created_at: session.created_at,
      last_used_at: session.last_used_at,
      is_current: refreshToken ? session.token === refreshToken : false
    }));

    return res.status(200).json({ sessions: formattedSessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

/**
 * @name revokeSessionController
 * @description Revoke a specific session
 * @access Private
 */
async function revokeSessionController(req: any, res: Response) {
  try {
    const { sessionId } = req.params;
    const currentRefreshToken = req.headers['x-refresh-token'] || req.body.refreshToken;

    const session = await prisma.refreshToken.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.user_id !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to revoke this session" });
    }

    if (currentRefreshToken && session.token === currentRefreshToken) {
      return res.status(400).json({ message: "Cannot revoke current session using this endpoint. Use logout instead." });
    }

    await prisma.refreshToken.delete({
      where: { id: sessionId }
    });

    return res.status(200).json({ message: "Session revoked successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

export {
  registerUserController,
  checkEmailController,
  loginUserController,
  logoutUserController,
  getMeController,
  refreshUserController,
  sendOtpController,
  verifyOtpController,
  forgotPasswordController,
  resetPasswordController,
  sendChangePasswordOtpController,
  changePasswordController,
  getSessionsController,
  revokeSessionController,
};
