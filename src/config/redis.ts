import Redis, { RedisOptions } from "ioredis";

const normalizeRedisHost = (host: string): string =>
  host
    .replace(/^redis:\/\//i, "")
    .replace(/^rediss:\/\//i, "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

const redisHost = normalizeRedisHost(process.env.REDIS_HOST || "localhost");
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisTlsFlag = (process.env.REDIS_TLS || "").toLowerCase() === "true";
const useTls = redisTlsFlag || redisHost.includes("upstash.io");

const redisConfig: RedisOptions = {
  host: redisHost,
  port: redisPort,
  password: process.env.REDIS_PASSWORD || undefined,
  connectTimeout: 10000,
  keepAlive: 30000,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
  // Do not throw application-level command errors while reconnecting.
  maxRetriesPerRequest: null,
  ...(useTls ? { tls: {} } : {}),
};

export const redis = new Redis(redisConfig);

redis.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redis.on("error", (error: Error) => {
  console.error("❌ Redis connection error:", error);
});

export default redis;
