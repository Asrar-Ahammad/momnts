import  type{ Request, Response } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/**
 * @name registerUserController
 * @description Register a new user, expecting name, email, and password in the request body.
 * @access Public
 */
async function registerUserController(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email and password",
      });
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
      },
    });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Generate access token (15 minutes)
    const accessToken = jwt.sign(
      { id: user.id, name: user.name },
      jwtSecret,
      { expiresIn: "1h" },
    );

    // Generate refresh token (7 days)
    const refreshToken = jwt.sign(
      { id: user.id, type: "refresh" },
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

    // Set HTTP-only cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({
      message: "User created successsfully",
      user: {
        id: user.id,
        username: user.name,
        email: user.email,
        created_at: user.created_at,
      },
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
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

    // Generate access token (15 minutes)
    const accessToken = jwt.sign(
      { id: user.id, name: user.name },
      jwtSecret,
      { expiresIn: "1h" },
    );

    // Generate refresh token (7 days)
    const refreshToken = jwt.sign(
      { id: user.id, type: "refresh" },
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

    // Set HTTP-only cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      message: "User logged in successfully",
      user: {
        id: user.id,
        username: user.name,
        email: user.email,
        selfie_url: user.selfie_url,
        created_at: user.created_at,
      },
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
    const refreshToken = req.cookies.refreshToken;

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
      { id: decoded.id, type: "refresh" },
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

    // Set new HTTP-only cookies
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      message: "Token refreshed successfully",
      user: {
        id: storedToken.user.id,
        username: storedToken.user.name,
        email: storedToken.user.email,
        selfie_url: storedToken.user.selfie_url,
        created_at: storedToken.user.created_at,
      },
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
    const refreshToken = req.cookies.refreshToken;
    const accessToken = req.cookies.accessToken;

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

    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

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
        selfie_url: true,
        created_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.name,
        email: user.email,
        selfie_url: user.selfie_url,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ message });
  }
}

export { registerUserController, loginUserController, logoutUserController, getMeController, refreshUserController };
