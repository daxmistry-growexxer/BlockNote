import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing access token" });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, config.jwtAccessSecret);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
}
