import { Router, json, type NextFunction, type Request, type Response } from "express";
import { intakeSchema } from "@receipts/shared";
import { startCheckout } from "./checkout.js";
import { enforcePreviewRateLimit } from "./rate-limit.js";
import { latestEvents } from "./events.js";
import { createOrder, getOrderView } from "./service.js";

type Handler = (req: Request, res: Response) => Promise<void>;

// express 5 forwards rejected promises, this keeps handlers free of try blocks
function wrap(handler: Handler) {
  return (req: Request, res: Response, next: NextFunction) => void handler(req, res).catch(next);
}

const MAX_EVENTS = 200;
const DEFAULT_EVENTS = 50;

export const ordersRouter = Router();
ordersRouter.use(json({ limit: "64kb" }));

ordersRouter.post(
  "/",
  wrap(async (req, res) => {
    await enforcePreviewRateLimit(req.ip ?? "unknown");
    const intake = intakeSchema.parse(req.body);
    res.status(201).json(await createOrder(intake));
  }),
);

ordersRouter.post(
  "/:token/checkout",
  wrap(async (req, res) => {
    res.status(200).json(await startCheckout(String(req.params.token)));
  }),
);

ordersRouter.get(
  "/:token",
  wrap(async (req, res) => {
    res.status(200).json(await getOrderView(String(req.params.token)));
  }),
);

export const eventsRouter = Router();

eventsRouter.get(
  "/",
  wrap(async (req, res) => {
    const asked = Number(req.query.limit ?? DEFAULT_EVENTS);
    const limit = Number.isInteger(asked) && asked > 0 ? Math.min(asked, MAX_EVENTS) : DEFAULT_EVENTS;
    res.status(200).json({ events: await latestEvents(limit) });
  }),
);
