import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { TokenModule } from './modules/token/token.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { MoviesModule } from './modules/movies/movies.module';
import { CinemasModule } from './modules/cinemas/cinemas.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { ScreenTypesModule } from './modules/screen_types/screen_types.module';
import { SeatsModule } from './modules/seats/seats.module';
import { SeatTypesModule } from './modules/seat_types/seat_types.module';
import { ShowTimesModule } from './modules/show_times/show_times.module';
import { BookingModule } from './modules/booking/booking.module';
import { RedisModule } from './common/redis/redis.module';
import { PaymentsModule } from './modules/payments/payments.module';
import stripeConfig from './config/stripe.config';
import { envValidationSchema } from './config/env.validation';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import appConfig from './config/app.config';
import redisConfig from './config/redis.config';
import rateLimitConfig from './config/rate-limit.config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './common/health/health.module';
import { TicketPricesModule } from './ticket_prices/ticket_prices.module';




@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        stripeConfig,
        databaseConfig,
        jwtConfig,
        appConfig,
        redisConfig,
        rateLimitConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),

    ThrottlerModule.forRootAsync({
      inject: [rateLimitConfig.KEY],
      useFactory: (cfg: ConfigType<typeof rateLimitConfig>) => ({

        throttlers: [
          {
            name: 'default',
            ttl: cfg.default.ttl,
            limit: cfg.default.limit
          },
        ]
      }),
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
    PaymentsModule,
    HealthModule,
    TicketPricesModule,
],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
