import * as Joi from 'joi';
export const envValidationSchema = Joi.object({

   NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
   PORT: Joi.number().default(3000),
   FRONTEND_URL: Joi.string().uri().required(),
   SHOWTIME_DEFAULT_DURATION: Joi.number().positive().default(120),
   SHOWTIME_BUFFER_DURATION: Joi.number().positive().default(30),

   //Database configuration
   DATABASE_URL: Joi.string().uri().required(),

   //Stripe configuration
   STRIPE_SECRET_KEY: Joi.string().required(),
   STRIPE_SECRET_WEBHOOK: Joi.string().required(),

   //Jwt configuration
   ACCESS_TOKEN_SECRET: Joi.string().required(),
   ACCESS_TOKEN_EXPIRES: Joi.string().required(),
   REFRESH_TOKEN_SECRET: Joi.string().required(),
   REFRESH_TOKEN_EXPIRES: Joi.string().required(),

   //Booking hold configuration
   HOLD_TTL_SECONDS: Joi.number().min(1800).default(1800),

   //Redis configuration
   REDIS_URL: Joi.string().uri().optional(),
   REDIS_HOST: Joi.string()
      .when('REDIS_URL', {
         is: Joi.exist(),
         then: Joi.optional(),
         otherwise: Joi.required()
      }),
   REDIS_PORT: Joi.number().port().default(6379),
   REDIS_PASSWORD: Joi.string().allow('').optional(),

   //Rate limit configuration
   RATE_LIMIT_TTL: Joi.number().positive(),
   RATE_LIMIT_LIMIT: Joi.number().positive(),
})