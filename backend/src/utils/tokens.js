import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function signAccessToken(user) {
  return jwt.sign(
    { email: user.email, type: "access" },
    config.jwtAccessSecret,
    { subject: user.id, expiresIn: config.accessTokenTtl }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { type: "refresh" },
    config.jwtRefreshSecret,
    {
      subject: user.id,
      expiresIn: `${config.refreshTokenTtlDays}d`
    }
  );
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getRefreshExpiryDate() {
  const now = Date.now();
  const ms = config.refreshTokenTtlDays * 24 * 60 * 60 * 1000;
  return new Date(now + ms);
}
