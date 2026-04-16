import dotenv from "dotenv";

dotenv.config();

const required = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const runtimeEnv = process.env.NODE_ENV || process.env.MODE_ENV || "development";

export const config = {
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenTtl: "15m",
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  shareTokenTtlMinutes: Number(process.env.SHARE_TOKEN_TTL_MINUTES || 60),
  cookieSecure: process.env.COOKIE_SECURE === "true" || runtimeEnv === "production"
};
