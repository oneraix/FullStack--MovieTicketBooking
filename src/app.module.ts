  import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
  import { AppController } from './app.controller';
  import { AppService } from './app.service';
  import { UserModule } from './modules/user/user.module';
  import { AuthModule } from './modules/auth/auth.module';
  import { PrismaModule } from './modules/prisma/prisma.module';
  import { TokenModule } from './modules/token/token.module';
  import { LoggerMiddleware } from './common/middleware/logger.middleware';
  import { ConfigModule } from '@nestjs/config';
  import { MoviesModule } from './modules/movies/movies.module';
  import { CinemasModule } from './modules/cinemas/cinemas.module';
  import { RoomsModule } from './modules/rooms/rooms.module';
  import { ScreenTypesModule } from './modules/screen_types/screen_types.module';
  import { SeatsModule } from './modules/seats/seats.module';
  import { SeatTypesModule } from './modules/seat_types/seat_types.module';
  import { ShowTimesModule } from './modules/show_times/show_times.module';
  import { BookingModule } from './modules/booking/booking.module';
  import { CacheModule } from '@nestjs/cache-manager';
  import * as redisStore from 'cache-manager-ioredis';
  import { RedisModule } from './common/redis/redis.module';
  import { PaymentsModule } from './modules/payments/payments.module';
import stripeConfig from './config/stripe.config';
import { abort, env } from 'process';
import { envValidationSchema } from './config/env.validation';
import { allow } from 'joi';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';




  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [stripeConfig, databaseConfig, jwtConfig],
        validationSchema: envValidationSchema,
        validationOptions:{
          allowUnknown: true,
          abortEarly: true,
        },
      }),
      RedisModule,
      UserModule,
      AuthModule,
      PrismaModule,
      TokenModule,
      MoviesModule,
      CinemasModule,
      RoomsModule,
      ScreenTypesModule,
      SeatsModule,
      SeatTypesModule,
      ShowTimesModule,
      BookingModule,
      PaymentsModule],
    controllers: [AppController],
    providers: [AppService],
  })
  export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      consumer.apply(LoggerMiddleware).forRoutes('*');
    }
  }
