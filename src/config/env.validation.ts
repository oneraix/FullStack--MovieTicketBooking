import * as Joi from 'joi';
 export const envValidationSchema = Joi.object({

    NODE_ENV : Joi.string().valid('development','production','test').default('development'),
    PORT: Joi.number().default(3000),

    //Database configuration
    DATABASE_URL: Joi.string().required(),

    //Stripe configuration
    STRIPE_SECRET_KEY: Joi.string().required(),
    STRIPE_SECRET_WEBHOOK: Joi.string().required(),

    //Jwt configuration
    ACCESS_TOKEN_SECRET: Joi.string().required(),
    ACCESS_TOKEN_EXPIRES: Joi.string().required(),
    REFRESH_TOKEN_SECRET: Joi.string().required(),
    REFRESH_TOKEN_EXPIRES: Joi.string().required(),

    //Redis configuration
    HOLD_TTL_SECONDS: Joi.number().default(500),

 })