import { ApiError } from '../utils/ApiError.js';

/**
 * validate({ params, query, body }) - each value is a zod schema.
 * Parsed (coerced, stripped) data is exposed on req.valid; raw input is never trusted.
 * Unknown body keys are stripped, which also blocks mass-assignment (e.g. "role").
 */
export const validate = (schemas) => (req, _res, next) => {
  const valid = {};
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.') || key,
        message: i.message,
      }));
      throw new ApiError(422, 'Validation failed', details);
    }
    valid[key] = result.data;
  }
  req.valid = valid;
  next();
};
