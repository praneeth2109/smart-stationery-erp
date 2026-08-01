import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "@/config/env";
import routes from "@/routes";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler";

const app = express();

// --- Security & core middleware -------------------------------------------
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
      if (allowedOrigins.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

// Rate limiting — protects auth endpoints from brute force
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// --- Health check -----------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- API routes ---------------------------------------------------------------
app.use("/api", routes);

// --- 404 + error handling ------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(env.PORT);
app.listen(port, () => {
  console.log(`🚀 Smart Stationery ERP API running on http://localhost:${port}`);
});
