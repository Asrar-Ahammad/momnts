import { Router } from "express";
import {
  loginUserController,
  logoutUserController,
  registerUserController,
  getMeController,
  refreshUserController,
  sendOtpController,
  verifyOtpController,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const authRouter = Router();

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */

authRouter.post("/register", registerUserController);

/**
 * @route POST /api/auth/login
 * @description Login a new user
 * @access Public
 */

authRouter.post("/login", loginUserController);

/**
 * @route POST /api/auth/refresh
 * @description Refresh access token using refresh token
 * @access Public
 */

authRouter.post("/refresh", refreshUserController);

/**
 * @route POST /api/auth/logout
 * @description Logout the current user and invalidate session
 * @access Private
 */

authRouter.post("/logout", authenticate, logoutUserController);

/**
 * @route GET /api/auth/me
 * @description Get current logged in user details
 * @access Private
 */

authRouter.get("/me", authenticate, getMeController);

/**
 * @route POST /api/auth/send-otp
 * @description Send OTP to user's email for verification (rate-limited)
 * @access Private
 */

authRouter.post("/send-otp", authenticate, sendOtpController);

/**
 * @route POST /api/auth/verify-otp
 * @description Verify OTP and mark email as verified (brute-force protected)
 * @access Private
 */

authRouter.post("/verify-otp", authenticate, verifyOtpController);

export { authRouter };

