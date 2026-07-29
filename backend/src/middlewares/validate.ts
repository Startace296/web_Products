import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";
import { ApiError } from "../utils/ApiError";

type RequestPart = "body" | "query" | "params";

// ZodTypeAny (not AnyZodObject) so schemas built with .refine()/.transform()
// (e.g. updateReviewSchema) — which are ZodEffects, not ZodObject — still fit.
// Usage in routes: router.post("/x", validate(createXSchema), controller.create)
export const validate =
  (schema: ZodTypeAny, part: RequestPart = "body") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      next(ApiError.unprocessable("Validation failed", result.error.flatten().fieldErrors));
      return;
    }

    // Replace with parsed data so defaults/coercions from the schema apply downstream.
    req[part] = result.data;
    next();
  };
