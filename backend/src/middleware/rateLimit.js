const buckets = new Map();

export const createRateLimit = ({ windowMs, max, message }) => (req, res, next) => {
  const now = Date.now();
  const key = `${req.ip}:${req.method}:${req.originalUrl.split("?")[0]}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return next();
  }

  current.count += 1;

  if (current.count > max) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      message,
    });
  }

  return next();
};

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many authentication attempts. Please wait and try again.",
});

export const passwordResetRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset attempts. Please wait and try again.",
});
