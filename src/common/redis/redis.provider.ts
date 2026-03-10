import { Provider } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import Redis from "ioredis";
import redisConfig from "src/config/redis.config";

export const IOREDIS_CLIENT = 'IOREDIS_CLIENT';//injection token


export const redisProvider: Provider = {
  provide: IOREDIS_CLIENT,
  inject: [redisConfig.KEY],
  useFactory: (config: ConfigType<typeof redisConfig>) => {
    if (config.url) {
      return new Redis(config.url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });
    }

    return new Redis({
      host: config.host,
      port: config.port,
      password: config.password || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  },
};