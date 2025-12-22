import'dotenv/config' 

export const DATABASE_URL = process.env.DATABASE_URL;
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
export const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET
export const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES
export const HOLD_TTL_SECONDS = Number(process.env.HOLD_TTL_SECONDS) || 600;
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ||''
export const STRIPE_SECRET_WEBHOOK = process.env.STRIPE_SECRET_WEBHOOK ||''
console.log({
    DATABASE_URL
})