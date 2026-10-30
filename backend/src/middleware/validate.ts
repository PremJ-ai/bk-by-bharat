import type { Request, Response, NextFunction } from "express";
import { type ZodType, ZodError } from "zod";
import { ValidationError } from "../lib/errors.js";

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as any;
      }
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as any;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of error.issues) {
          const path = issue.path.join(".");
          fields[path || "root"] = issue.message;
        }
        next(new ValidationError("Request validation failed.", fields));
      } else {
        next(error);
      }
    }
  };
}

export function validateBody(schema: ZodType) {
  return validate({ body: schema });
}

export function validateQuery(schema: ZodType) {
  return validate({ query: schema });
}

export function validateParams(schema: ZodType) {
  return validate({ params: schema });
}
