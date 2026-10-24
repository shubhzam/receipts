import { Router, json, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { assignmentRequestSchema, voteRequestSchema } from "@receipts/shared";
import { HttpError } from "./errors.js";
import { assign, castVote, getCaseView } from "./service.js";

type Handler = (req: Request, res: Response) => Promise<void>;

// express 5 forwards rejected promises, this keeps handlers free of try blocks
function wrap(handler: Handler) {
  return (req: Request, res: Response, next: NextFunction) => void handler(req, res).catch(next);
}

export const juryRouter = Router();
juryRouter.use(json());

juryRouter.post(
  "/assignments",
  wrap(async (req, res) => {
    const input = assignmentRequestSchema.parse(req.body);
    res.status(200).json(await assign(input.studyKey, input.teracSubmissionId));
  }),
);

juryRouter.get(
  "/cases/:caseKey",
  wrap(async (req, res) => {
    const study = typeof req.query.study === "string" ? req.query.study : "";
    res.status(200).json(await getCaseView(String(req.params.caseKey), study));
  }),
);

juryRouter.post(
  "/votes",
  wrap(async (req, res) => {
    const input = voteRequestSchema.parse(req.body);
    const result = await castVote(input);
    res.status(result.created ? 201 : 200).json(result.body);
  }),
);

export function juryErrorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
  } else if (err instanceof ZodError) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: err.issues.map((i) => i.message).join("; ") } });
  } else {
    next(err);
  }
}
