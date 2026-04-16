import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { config } from "../config.js";
import { authRequired } from "../middleware/auth.js";
import {
  getRefreshExpiryDate,
  hashToken,
  signAccessToken,
  signRefreshToken
} from "../utils/tokens.js";

const router = express.Router();

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/api/auth",
    expires: getRefreshExpiryDate()
  };
}

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, getRefreshCookieOptions());
}

function clearRefreshTokenCookie(res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/api/auth"
  });
}

function getRefreshTokenFromRequest(req) {
  const cookieHeader = String(req.headers.cookie || "");
  if (!cookieHeader) return "";

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("refreshToken="));

  if (!cookie) return "";

  return decodeURIComponent(cookie.slice("refreshToken=".length));
}

function isValidPassword(password) {
  return /^(?=.*\d).{8,}$/.test(password);
}

function getCredentials(body) {
  return {
    email: String(body.email || "").trim().toLowerCase(),
    password: String(body.password || "")
  };
}

function invalidCredentials(res) {
  return res.status(401).json({ message: "Invalid credentials" });
}

async function createSessionTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, hashToken(refreshToken), getRefreshExpiryDate()]
  );

  return { accessToken, refreshToken };
}

router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = getCredentials(req.body);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!isValidPassword(password)) {
      return res.status(422).json({
        message: "Password must be at least 8 characters and include at least 1 number"
      });
    }

    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email, passwordHash]
    );

    const newUser = created.rows[0];
    const { accessToken, refreshToken } = await createSessionTokens(newUser);
    setRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      accessToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        created_at: newUser.created_at
      }
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = getCredentials(req.body);

    const userResult = await query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rowCount === 0) {
      return invalidCredentials(res);
    }

    const user = userResult.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return invalidCredentials(res);
    }

    const { accessToken, refreshToken } = await createSessionTokens(user);
    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return res.status(401).json({ message: "Missing refresh token" });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (payload.type !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const tokenHash = hashToken(refreshToken);
    const found = await query(
      `SELECT id, user_id, expires_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    if (found.rowCount === 0) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const stored = found.rows[0];
    const expired = new Date(stored.expires_at).getTime() < Date.now();
    if (stored.revoked_at || expired) {
      return res.status(401).json({ message: "Refresh token expired or revoked" });
    }

    const userResult = await query(
      "SELECT id, email FROM users WHERE id = $1",
      [stored.user_id]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = userResult.rows[0];

    await query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1", [stored.id]);
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await createSessionTokens(user);
    setRefreshTokenCookie(res, newRefreshToken);

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return next(err);
  }
});

router.get("/me", authRequired, async (req, res, next) => {
  try {
    const result = await query(
      "SELECT id, email, created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    return res.json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.post("/logout", authRequired, async (req, res, next) => {
  try {
    await query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1", [req.user.id]);
    clearRefreshTokenCookie(res);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
