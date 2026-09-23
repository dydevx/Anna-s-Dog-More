import "server-only";

const local = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(key: string, limit = 8, windowSeconds = 60) {
  const redisUrl = process.env.RATE_LIMIT_REDIS_URL;
  const redisToken = process.env.RATE_LIMIT_REDIS_TOKEN;
  if (redisUrl && redisToken) {
    const bucket = `rate:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
    const response = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", bucket], ["EXPIRE", bucket, windowSeconds]]),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("RATE_LIMIT_STORE_UNAVAILABLE");
    const result = await response.json() as Array<{ result: number }>;
    return result[0].result <= limit;
  }
  const now = Date.now();
  const record = local.get(key);
  if (!record || record.resetAt <= now) {
    local.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  record.count += 1;
  return record.count <= limit;
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}
