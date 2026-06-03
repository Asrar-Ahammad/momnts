import axios from "axios";

/**
 * Verifies the Cloudflare Turnstile CAPTCHA token with Cloudflare's API.
 * @param token CAPTCHA token received from client
 * @param ip Optional remote IP address of the client
 * @returns boolean indicating if the token is valid
 */
export async function verifyTurnstileToken(token?: string, ip?: string): Promise<boolean> {
  // If Turnstile is bypassed in non-production, test mode, or skipped, allow request
  if (process.env.NODE_ENV !== "production" || process.env.SKIP_CAPTCHA === "true") {
    return true;
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.warn("[TURNSTILE] TURNSTILE_SECRET_KEY is not defined. Skipping verification (dev mode).");
    return true;
  }

  // Support local mock/script testing
  if (token === "mock-turnstile-token" && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secretKey);
    params.append("response", token);
    if (ip) {
      params.append("remoteip", ip);
    }

    const response = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return !!response.data?.success;
  } catch (error) {
    console.error("[TURNSTILE] Verification error:", error);
    return false;
  }
}
