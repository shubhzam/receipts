import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { runHealthChecks } from "./health.js";

const app = express();

// the web app lives on another origin, cors handles preflight options too
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "ngrok-skip-browser-warning"],
  }),
);

app.get("/health", async (_req, res) => {
  const body = await runHealthChecks();
  res.status(body.status === "ok" ? 200 : 503).json(body);
});

app.listen(config.port, () => {
  console.log(`api listening on port ${config.port}`);
});
