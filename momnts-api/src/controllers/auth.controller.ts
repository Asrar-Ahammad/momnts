import  type{ Request, Response } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { redis } from "../lib/redis";
import { sendOtpEmail, sendPasswordResetOtpEmail } from "../lib/mailer";

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

  const otp = generateOtp();
  const hashed = await hashOtp(otp);

  try {
    await sendPasswordResetOtpEmail(email, otp);
  } catch (error) {
    await redis.decr(pwdOtpRateKey(userId));
    throw error;
  }

  await redis.setex(pwdOtpKey(userId), OTP_TTL_SECONDS, hashed);
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

  const otp = generateOtp();
  const hashed = await hashOtp(otp);

  try {
    // Send email FIRST (OTP never logged)
    // If this throws (e.g. invalid credentials), the function aborts
    await sendOtpEmail(email, otp);
  } catch (error) {
    // Refund the rate limit count since the email failed
    await redis.decr(otpRateKey(userId));
    throw error;
  }

  // Store hashed OTP with TTL
  await redis.setex(otpKey(userId), OTP_TTL_SECONDS, hashed);
  // Reset attempt counter
  await redis.del(otpAttemptsKey(userId));

  return { success: true };
}

// ─── User response shape helper ──────────────────────────────────────
function userResponse(user: { id: string; name: string; email: string; email_verified: boolean; selfie_url: string | null; created_at: Date }) {
  return {
    id: user.id,
    username: user.name,
    email: user.email,
    email_verified: user.email_verified,
    selfie_url: user.selfie_url,
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
    const { name, password } = req.body;
    const email = req.body.email?.toLowerCase().trim();

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

    // Generate access token (1 hr)
    const accessToken = jwt.sign(
      { id: user.id, name: user.name },
      jwtSecret,
      { expiresIn: "1h" },
    );

    // Generate refresh token (7 days)
    const refreshToken = jwt.sign(
      { id: user.id, type: "refresh", jti: Math.random().toString(36).substring(2) },
      jwtSecret,
      { expiresIn: "7d" },
    );

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        user_id: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
      user: userResponse(user),
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
    const { password } = req.body;
    const email = req.body.email?.toLowerCase().trim();

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

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Generate access token (1 hr)
    const accessToken = jwt.sign(
      { id: user.id, name: user.name },
      jwtSecret,
      { expiresIn: "1h" },
    );

    // Generate refresh token (7 days)
    const refreshToken = jwt.sign(
      { id: user.id, type: "refresh", jti: Math.random().toString(36).substring(2) },
      jwtSecret,
      { expiresIn: "7d" },
    );

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        user_id: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return res.status(200).json({
      message: "User logged in successfully",
      accessToken,
      refreshToken,
      user: userResponse(user),
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

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: decoded.id, name: storedToken.user.name },
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

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        user_id: decoded.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return res.status(200).json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: userResponse(storedToken.user),
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
        created_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: userResponse(user),
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
      select: { id: true, email_verified: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.email_verified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Get stored OTP hash
    const storedHash = await redis.get(otpKey(userId));
    if (!storedHash) {
      return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
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
      // Delete OTP and attempts — force fresh OTP after lockout
      await redis.del(otpKey(userId), otpAttemptsKey(userId));

      return res.status(429).json({
        message: "Too many failed attempts. Your account is temporarily locked. Please try again in 30 minutes.",
        retryAfter: OTP_LOCKOUT_SECONDS,
      });
    }

    // Verify OTP (bcrypt.compare is internally constant-time)
    const isValid = await verifyOtp(otp, storedHash);
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

    // Cleanup Redis — one-time use, delete immediately
    await redis.del(otpKey(userId), otpAttemptsKey(userId), otpRateKey(userId));

    return res.status(200).json({
      message: "Email verified successfully",
      user: userResponse(updatedUser),
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
    const email = req.body.email?.toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (email.length > 255) {
      return res.status(400).json({ message: "Invalid email" });
    }

    // Security: Rate limit by email string *before* DB query to prevent enumeration
    const ipOrEmailRateKey = `pwd_req_rate:${email}`;
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
    const email = req.body.email?.toLowerCase().trim();
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
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

    const hashedOtp = await redis.get(pwdOtpKey(userId));
    if (!hashedOtp) {
      return res.status(400).json({ message: "Verification code expired or invalid" });
    }

    const isValid = await verifyOtp(otp, hashedOtp);
    if (!isValid) {
      const attempts = await redis.incr(pwdOtpAttemptsKey(userId));
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await redis.setex(pwdOtpLockoutKey(userId), OTP_LOCKOUT_SECONDS, "locked");
        await redis.del(pwdOtpKey(userId), pwdOtpAttemptsKey(userId));
        return res.status(403).json({
          message: "Too many failed attempts. Your account is temporarily locked from resetting password. Please try again in 30 minutes.",
        });
      }
      return res.status(400).json({
        message: `Invalid verification code. ${OTP_MAX_ATTEMPTS - attempts} attempt(s) remaining.`,
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
    await redis.del(pwdOtpKey(userId), pwdOtpAttemptsKey(userId), pwdOtpRateKey(userId));

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

    const lockout = await redis.get(pwdOtpLockoutKey(userId));
    if (lockout) {
      return res.status(403).json({
        message: "Too many failed attempts. Your account is temporarily locked from changing password. Please try again in 30 minutes.",
      });
    }

    const hashedOtp = await redis.get(pwdOtpKey(userId));
    if (!hashedOtp) {
      return res.status(400).json({ message: "Verification code expired or invalid" });
    }

    const isValid = await verifyOtp(otp, hashedOtp);
    if (!isValid) {
      const attempts = await redis.incr(pwdOtpAttemptsKey(userId));
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await redis.setex(pwdOtpLockoutKey(userId), OTP_LOCKOUT_SECONDS, "locked");
        await redis.del(pwdOtpKey(userId), pwdOtpAttemptsKey(userId));
        return res.status(403).json({
          message: "Too many failed attempts. Your account is temporarily locked. Please try again in 30 minutes.",
        });
      }
      return res.status(400).json({
        message: `Invalid verification code. ${OTP_MAX_ATTEMPTS - attempts} attempt(s) remaining.`,
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

    await redis.del(pwdOtpKey(userId), pwdOtpAttemptsKey(userId), pwdOtpRateKey(userId));

    return res.status(200).json({ message: "Password has been successfully changed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

export {
  registerUserController,
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
};
