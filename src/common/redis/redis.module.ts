import { Global, Module } from "@nestjs/common";
import { redisProvider } from "./redis.provider";
import { ConfigModule } from "@nestjs/config";
import redisConfig from "src/config/redis.config";


@Global()
@Module({
    imports: [ConfigModule.forFeature(redisConfig)],//tdung feature tránh trùng port của database
    providers: [redisProvider],
    exports: [redisProvider],
})
export class RedisModule {}