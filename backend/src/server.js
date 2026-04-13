import cors from "cors";
import express from "express";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import documentRoutes from "./routes/documents.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
