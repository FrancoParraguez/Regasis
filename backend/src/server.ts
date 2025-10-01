import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import router from "./routes/index.js";
import { audit } from "./middleware/audit.js";
import { errorHandler } from "./middleware/error.js";

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(audit);
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", router);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT}`);
});
