import { registerAs } from "@nestjs/config";

export default registerAs('rate-limit',() => ({
    default:{
        ttl: Number(process.env.RATE_LIMIT_TTL ||60000),
        limit: Number(process.env.RATE_LIMIT_LIMIT|| 100),
    },
}))