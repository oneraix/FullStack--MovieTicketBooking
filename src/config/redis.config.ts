import { registerAs } from "@nestjs/config";

export default registerAs('redis',() => ({
    hold_ttl: Number(process.env.HOLD_TTL_SECONDS) || 300,
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT??'6379'),
    password: process.env.REDIS_PASSWORD
}))