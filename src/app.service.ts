import { Inject, Injectable } from '@nestjs/common';
import { IOREDIS_CLIENT } from 'src/common/redis/redis.provider';
import Redis from 'ioredis';

@Injectable()
export class AppService {
  constructor(
    @Inject(IOREDIS_CLIENT) private readonly redisClient: Redis,
  ) {}
}