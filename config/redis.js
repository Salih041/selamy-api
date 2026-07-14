import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.REDIS_URL) {
    console.warn("No REDIS_URL");
    console.log("Redis url: ", process.env.REDIS_URL);
}

export const redis = new Redis(process.env.REDIS_URL ?? null);