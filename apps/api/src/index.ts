import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { runHealthChecks } from "./health.js";
import { juryErrorHandler, juryRouter } from "./jury/routes.js";
import { eventsRouter, ordersRouter } from "./orders/routes.js";
import { webhookRouter } from "./orders/webhook.js";

const app = express();

// ngrok sits in front, so the client ip comes from x-forwarded-for
app.set("trust proxy", 1);

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

// the webhook keeps its raw body, no router before it may parse json
app.use("/webhooks", webhookRouter);
app.use("/jury", juryRouter);
app.use("/orders", ordersRouter);
app.use("/events", eventsRouter);
app.use(juryErrorHandler);

app.listen(config.port, () => {
  console.log(`api listening on port ${config.port}`);
});
