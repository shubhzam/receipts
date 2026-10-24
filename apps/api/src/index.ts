import express from "express";
import { config } from "./config.js";
import { runHealthChecks } from "./health.js";

const app = express();

// health is public and read-only, the web app on another origin reads it
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", config.corsOrigin);
  next();
});

app.get("/health", async (_req, res) => {
  const body = await runHealthChecks();
  res.status(body.status === "ok" ? 200 : 503).json(body);
});

app.listen(config.port, () => {
  console.log(`api listening on port ${config.port}`);
});
