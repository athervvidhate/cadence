function validateRequest(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => issue.message).join(", ");
      const error = new Error(`Validation failed: ${errors}`);
      error.statusCode = 400;
      return next(error);
    }
    req.validatedBody = result.data;
    return next();
  };
}

module.exports = { validateRequest };
